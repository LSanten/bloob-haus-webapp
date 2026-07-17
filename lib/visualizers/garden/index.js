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
 * Ported from the builder's exporter.js (state → {html, css, js}), with the
 * canvas-generated background replaced by CSS (sky/soil split) — the build has
 * no canvas. Element pages are markdown prose (prose-only decision,
 * 2026-07-17), rendered through markdown-it.
 */

import MarkdownIt from "markdown-it";
import { findGardenFence, parseGarden } from "./parser.js";

export const type = "hybrid";
export const name = "garden";

const md = new MarkdownIt({ html: false, linkify: true });

const ICON_BASE = "/assets/visualizers/garden/icons";
const SOIL_TOP = "#8a6d4b";
const SOIL_BOTTOM = "#6f5539";
const SOIL_SPLIT = 65; // % of canvas height that is sky when ground: soil

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

  // Scene background: a painting wins; otherwise CSS sky (with optional soil).
  let sceneBg;
  if (settings.ground === "soil") {
    sceneBg = `linear-gradient(to bottom, ${settings.sky} 0%, ${settings.sky} ${SOIL_SPLIT}%, ${SOIL_TOP} ${SOIL_SPLIT}%, ${SOIL_BOTTOM} 100%)`;
  } else {
    sceneBg = settings.sky;
  }
  // `no-optimize` opts out of the site's image transform (PhotoSwipe wrapping,
  // webp rewriting) — icons and paintings are shape UI, not content photos.
  const paintingHTML = settings.painting
    ? `<img class="garden-painting no-optimize" src="${escapeAttr(rootPath(settings.painting))}" alt="">`
    : "";

  // Document order = stacking (z) order — later items render on top.
  const itemsHTML = elements
    .map((el, i) => renderItem(el, i + 1))
    .join("\n");

  const pagesHTML = elements
    .filter((el) => el.type !== "label" && el.page.length > 0)
    .map(renderPage)
    .join("\n");

  const html = `<div class="garden-shape" data-garden-title="${escapeAttr(settings.title || "")}" data-canvas-w="${width}" data-canvas-h="${height}">
<div class="garden-view">
<div class="garden-scale">
<div class="garden-scene" style="width:${width}px;height:${height}px;background:${escapeAttr(sceneBg)};">
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

function renderItem(el, z) {
  if (el.type === "label") {
    return `<div class="garden-label" style="left:${el.x}px;top:${el.y}px;z-index:${z};font-size:${el.fontSize}px;">${escapeHTML(el.title)}</div>`;
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

  const pos = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${z};`;
  if (el.page.length > 0) {
    return `<button type="button" class="garden-element" style="${pos}" data-garden-page="${escapeAttr(el.id)}" title="${escapeAttr(el.title)}">${iconHTML}</button>`;
  }
  return `<div class="garden-element garden-element--static" style="${pos}" title="${escapeAttr(el.title)}">${iconHTML}</div>`;
}

function renderPage(el) {
  const proseHTML = el.page.map((paragraph) => md.render(paragraph)).join("\n");
  return `<section class="garden-page" id="garden-page-${escapeAttr(el.id)}" hidden>
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
