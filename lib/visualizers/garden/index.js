/**
 * index.js — the garden shape's build-time renderer.
 *
 * File-scope: `renderFilescope(settings, body)` finds the `::: garden` fence in
 * the body (garden parses its own block — see parser.js), and replaces the
 * entire body with the rendered garden HTML. The page is `chrome: none`
 * (layout.njk is a bare standalone document).
 *
 * V1 is file-scope only. Inline (`::: garden` embedded in a prose page) shares
 * this same generator and is wired up when a real inline use case exists.
 *
 * Ported from the builder's exporter.js (state → {html, css, js}). The
 * canvas-generated backgrounds become CSS: sky presets are her exact gradient
 * stops with CSS-approximated clouds/sun/rain; ground textures are her base
 * palette with light CSS texture. Element pages are markdown prose (prose-only
 * decision, 2026-07-17), rendered through markdown-it.
 */

import MarkdownIt from "markdown-it";
import { findGardenFence, parseGarden, FONT_STACKS } from "./parser.js";

export const type = "hybrid";
export const name = "garden";

const md = new MarkdownIt({ html: false, linkify: true });

const ICON_BASE = "/assets/visualizers/garden/icons";
const SOIL_SPLIT = 65; // % of canvas height that is sky when ground is set
const HIGHLIGHT_COLOR = "#fff176"; // her label highlighter yellow

// Ground textures: her canvas palette (generateSoilPattern), base + accent.
const GROUNDS = {
  soil: { base: "#8a6d4b", deep: "#6f5539" },
  dirt: { base: "#8B6914", deep: "#7A5C10" },
  grass: { base: "#4a8c3f", deep: "#3d7a33" },
  gravel: { base: "#9e9e9e", deep: "#888888" },
  sand: { base: "#e8d68e", deep: "#d4c27a" },
};

/**
 * @param {object} _settings  shared `:::settings` YAML settings — unused; the
 *                            `::: garden` block is garden's single source of truth
 * @param {string} body       the processed markdown body
 * @returns {string}          inner HTML replacing the body
 */
export function renderFilescope(_settings, body) {
  const fence = findGardenFence(body);
  if (!fence) return body;
  const garden = parseGarden(fence.inner);
  return renderGarden(garden);
}

export function renderGarden({ settings, elements }) {
  const { width, height } = settings.canvas;
  const hasGround = Boolean(settings.ground && GROUNDS[settings.ground]);

  const skyBg = skyBackground(settings.sky, width, height, hasGround);
  const groundHTML = hasGround ? renderGround(settings.ground) : "";

  // `no-optimize` opts out of the site's image transform (PhotoSwipe wrapping,
  // webp rewriting) — icons and paintings are shape UI, not content photos.
  const paintingHTML = settings.painting
    ? `<img class="garden-painting no-optimize" src="${escapeAttr(rootPath(settings.painting))}" alt="">`
    : "";

  // Document order = stacking (z) order — later items render on top.
  const itemsHTML = elements.map((el, i) => renderItem(el, i + 1)).join("\n");

  const pagesHTML = elements
    .filter((el) => el.type !== "label" && el.page.length > 0)
    .map(renderPage)
    .join("\n");

  const html = `<div class="garden-shape" data-garden-title="${escapeAttr(settings.title || "")}" data-canvas-w="${width}" data-canvas-h="${height}">
<div class="garden-view">
<div class="garden-scale">
<div class="garden-scene" style="width:${width}px;height:${height}px;background:${escapeAttr(skyBg)};">
${groundHTML}
${paintingHTML}
<div class="garden-elements">
${itemsHTML}
</div>
</div>
</div>
</div>
<div class="garden-pages" hidden>
${pagesHTML}
</div>
</div>`;

  // No blank lines — markdown-it must treat the whole thing as one HTML block.
  return html.replace(/\n{2,}/g, "\n");
}

/**
 * The sky as CSS background layers, in the scene's logical pixel space.
 * Preset gradients use her exact color stops (canvas-engine drawPresetBackground);
 * clouds/sun/rain are CSS approximations of her canvas shapes.
 */
function skyBackground(sky, w, h, hasGround) {
  // The gradient ramp completes at the soil line (she draws sky only to soilY).
  const end = hasGround ? SOIL_SPLIT : 100;

  if (sky === "clouds") {
    const clouds = [
      [0.15, 0.12, 60], [0.5, 0.08, 80], [0.8, 0.18, 50], [0.35, 0.28, 45], [0.7, 0.35, 55],
    ].map(([fx, fy, size]) => cloudLayer(fx * w, fy * h, size, "rgba(255,255,255,0.9)"));
    return `${clouds.join(", ")}, linear-gradient(to bottom, #4a90d9 0%, #87CEEB ${end}%)`;
  }
  if (sky === "sunny") {
    const sun = `radial-gradient(circle 50px at ${0.8 * w}px ${0.12 * h}px, #FFEE55 0 46px, rgba(255,238,85,0.35) 46px 50px, transparent 50px) no-repeat`;
    return `${sun}, linear-gradient(to bottom, #FFD700 0%, #FFA500 ${end * 0.3}%, #87CEEB ${end}%)`;
  }
  if (sky === "rainy") {
    const clouds = [
      [0.2, 0.1, 70, "#666"], [0.55, 0.06, 90, "#555"], [0.85, 0.15, 60, "#666"],
    ].map(([fx, fy, size, color]) => cloudLayer(fx * w, fy * h, size, color));
    const rain = `repeating-linear-gradient(100deg, transparent 0 26px, rgba(220,225,235,0.35) 26px 28px) no-repeat 0 0 / 100% ${(end / 100) * h * 0.9}px`;
    return `${rain}, ${clouds.join(", ")}, linear-gradient(to bottom, #4a4a5a 0%, #7a7a8a ${end}%)`;
  }
  // A plain color (hex or any CSS color).
  return sky;
}

/** One cloud as a soft radial-gradient layer centered at (x, y) logical px. */
function cloudLayer(x, y, size, color) {
  const rw = size * 1.6;
  const rh = size * 0.9;
  return `radial-gradient(ellipse ${rw}px ${rh}px at center, ${color} 0 62%, transparent 68%) no-repeat ${Math.round(x - rw)}px ${Math.round(y - rh)}px / ${rw * 2}px ${rh * 2}px`;
}

/** The bottom 35% ground strip, textured per her soil palette. */
function renderGround(ground) {
  return `<div class="garden-ground garden-ground--${escapeAttr(ground)}"></div>`;
}

function renderItem(el, z) {
  if (el.type === "label") {
    if (el.src) {
      // Drawn label — a decorative image, not clickable.
      return `<img class="garden-label garden-label--drawn no-optimize" src="${escapeAttr(rootPath(el.src))}" alt="" draggable="false" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${z};">`;
    }
    let style = `left:${el.x}px;top:${el.y}px;z-index:${z};font-size:${el.fontSize}px;`;
    if (el.font) style += `font-family:${FONT_STACKS[el.font]};`;
    if (el.color) style += `color:${escapeAttr(el.color)};`;
    if (el.bold) style += "font-weight:bold;";
    if (el.italic) style += "font-style:italic;";
    if (el.highlight) style += `background-color:${HIGHLIGHT_COLOR};padding:1px 4px;border-radius:3px;`;
    return `<div class="garden-label" style="${style}">${escapeHTML(el.title)}</div>`;
  }

  let iconHTML;
  if (el.src) {
    iconHTML = `<img class="no-optimize" src="${escapeAttr(rootPath(el.src))}" alt="${escapeAttr(el.title)}" draggable="false">`;
  } else if (el.type !== "custom" && isKnownIcon(el.type)) {
    iconHTML = `<img class="no-optimize" src="${ICON_BASE}/${el.type}.png" alt="${escapeAttr(el.title)}" draggable="false">`;
  } else {
    // Unrecognized type (or custom without src): fall back to a titled marker.
    iconHTML = `<span class="garden-element-fallback">${escapeHTML(el.title)}</span>`;
  }

  let style = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${z};`;
  if (el.glow) {
    style += `filter:drop-shadow(0 0 3px ${escapeAttr(el.glow)}) drop-shadow(0 0 6px ${escapeAttr(el.glow)});`;
  }
  const hoverClass = ` hover-${el.hover || "scale"}`;

  if (el.page.length > 0) {
    return `<button type="button" class="garden-element${hoverClass}" style="${style}" data-garden-page="${escapeAttr(el.id)}" title="${escapeAttr(el.title)}">${iconHTML}</button>`;
  }
  return `<div class="garden-element garden-element--static${hoverClass}" style="${style}" title="${escapeAttr(el.title)}">${iconHTML}</div>`;
}

function renderPage(el) {
  const ps = el.pageSettings || {};
  let style = "";
  if (ps.font && FONT_STACKS[ps.font]) style += `font-family:${FONT_STACKS[ps.font]};`;
  if (ps.bg) style += `background-color:${escapeAttr(ps.bg)};`;
  const layoutClass = ps.layout === "columns" ? " garden-page--columns" : "";

  const proseHTML = el.page.map((paragraph) => md.render(paragraph)).join("\n");
  return `<section class="garden-page${layoutClass}" id="garden-page-${escapeAttr(el.id)}"${style ? ` style="${style}"` : ""} hidden>
<button type="button" class="garden-back-btn">Back to Garden</button>
<h1 class="garden-page-title">${escapeHTML(el.title)}</h1>
<div class="garden-page-prose">
${proseHTML}
</div>
</section>`;
}

function isKnownIcon(type) {
  return [
    "seed", "sapling", "mature-tree", "flower",
    "compost", "water-bucket", "waffle-planter", "bee",
  ].includes(type);
}

/** Media paths in the fence are vault-relative — serve from the site root. */
function rootPath(p) {
  return p.startsWith("/") || /^https?:/.test(p) ? p : `/${p}`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHTML(str).replace(/"/g, "&quot;");
}
