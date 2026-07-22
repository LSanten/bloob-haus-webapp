/**
 * Scene-nav curated overlay loops + color/strength model.
 *
 * Bundled B&W animated loops that render *only where an element's artwork has
 * opaque pixels* (alpha-masked). The loop is grayscale; `overlayColor` chooses how
 * it reads on the artwork:
 *   - a LIGHT color (default white)  → `mix-blend-mode: screen` — bright ripples,
 *     good over DARK artwork (the Studio Bloob header/footer case).
 *   - a DARK color (e.g. dark grey)  → `filter: invert(1)` + `mix-blend-mode: multiply`
 *     — dark caustics, good over LIGHT artwork (melt's pale watercolor bubbles).
 * `overlayStrength` (0–100) maps to opacity.
 *
 * Files live in assets/overlays/ and are copied by bundle-visualizers.js to
 * /assets/visualizers/scene-nav/overlays/<file>. Pure module — safe to import from
 * the renderer and the browser builder. To add a loop: drop a file in assets/overlays/
 * and add a registry entry.
 */

export const OVERLAY_BASE = "/assets/visualizers/scene-nav/overlays";

export const OVERLAYS = {
  water: { file: "water.gif", label: "Moving water", opacity: 0.7 },
};

// The default tint when an author doesn't set `overlayColor`. White → bright/screen.
export const DEFAULT_OVERLAY_COLOR = "#ffffff";

const NAMED = {
  white: "#ffffff", black: "#000000", gray: "#808080", grey: "#808080",
  darkgray: "#444444", darkgrey: "#444444", dimgray: "#555555", dimgrey: "#555555",
  lightgray: "#cccccc", lightgrey: "#cccccc", silver: "#c0c0c0", charcoal: "#333333",
};

/**
 * Relative luminance (0..1) of a hex / rgb() / basic-named color. Anything we can't
 * parse returns 1 (treated as light), so an unrecognized color keeps the bright/screen
 * default rather than surprising the author with an inverted look.
 * @param {string} color
 * @returns {number} 0..1
 */
export function colorLuminance(color) {
  if (!color) return 1;
  let c = String(color).trim().toLowerCase();
  const named = NAMED[c.replace(/\s+/g, "")];
  if (named) c = named;

  let r, g, b;
  const rgb = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    [r, g, b] = [+rgb[1], +rgb[2], +rgb[3]];
  } else {
    let hex = c.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    if (!/^[0-9a-f]{6}$/.test(hex)) return 1;
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Resolve a grammar overlay to its render params, or null if empty/unknown.
 * @param {string|null|undefined} id
 * @param {{ color?: string, strength?: number }} [opts]
 *   color: CSS color (light → bright/screen, dark → inverted/multiply)
 *   strength: opacity 0..1 (defaults to the registry entry's opacity)
 * @returns {{ id, url, label, color, opacity, blend, filter } | null}
 */
export function resolveOverlay(id, opts = {}) {
  if (!id) return null;
  const key = String(id).trim().toLowerCase();
  const entry = OVERLAYS[key];
  if (!entry) return null;

  const color = opts.color || DEFAULT_OVERLAY_COLOR;
  const dark = colorLuminance(color) < 0.5;
  const strength = Number.isFinite(opts.strength) ? opts.strength : entry.opacity;

  return {
    id: key,
    url: `${OVERLAY_BASE}/${entry.file}`,
    label: entry.label,
    color,
    opacity: Math.max(0, Math.min(1, strength)),
    blend: dark ? "multiply" : "screen",
    filter: dark ? "invert(1)" : "none",
  };
}
