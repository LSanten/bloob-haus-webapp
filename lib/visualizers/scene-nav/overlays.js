/**
 * Scene-nav curated overlay loops + exact-color tint model.
 *
 * A grayscale animated loop is tinted to ANY chosen color and masked to the element's
 * artwork. The tint is exact (`background-color`), applied to the loop via
 * `background-blend-mode`, then composited onto the artwork via `mix-blend-mode`:
 *
 *   - DARK  color (e.g. dark grey / green / blue over LIGHT artwork — melt's bubbles):
 *       use the WHITE-bg loop variant; `background-blend: screen` turns its black ripples
 *       into the tint on a white field; `mix-blend: multiply` drops the white and darkens
 *       the artwork with tinted caustics.
 *   - LIGHT color (bright water over DARK artwork):
 *       use the BLACK-bg loop; `background-blend: multiply` tints the white ripples; the
 *       black field stays black; `mix-blend: screen` drops the black and brightens.
 *
 * Both paths need only background-blend-mode + mix-blend-mode + a single alpha mask — all
 * well supported incl. iOS Safari (no mask-composite, no animated masks, no hue-flipping
 * invert). `overlayStrength` (0–100) maps to opacity.
 *
 * Files live in assets/overlays/ and are copied by bundle-visualizers.js to
 * /assets/visualizers/scene-nav/overlays/<file>. Pure module. To add a loop: drop the
 * black-bg file + its negated white-bg twin (`ffmpeg -i x.gif -vf negate x-light.gif`)
 * and add a registry entry.
 */

export const OVERLAY_BASE = "/assets/visualizers/scene-nav/overlays";

export const OVERLAYS = {
  // file = black background (bright/light-tint path); fileLight = white background (dark-tint path)
  water: { file: "water.gif", fileLight: "water-light.gif", label: "Moving water", opacity: 0.7 },
};

// The default tint when an author doesn't set `overlayColor`. White → bright water.
export const DEFAULT_OVERLAY_COLOR = "#ffffff";

const NAMED = {
  white: "#ffffff", black: "#000000", gray: "#808080", grey: "#808080",
  darkgray: "#444444", darkgrey: "#444444", dimgray: "#555555", dimgrey: "#555555",
  lightgray: "#cccccc", lightgrey: "#cccccc", silver: "#c0c0c0", charcoal: "#333333",
};

/**
 * Relative luminance (0..1) of a hex / rgb() / basic-named color. Anything we can't
 * parse returns 1 (treated as light), so an unrecognized color keeps the bright default.
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
 *   color: any CSS color — the exact tint of the water (light → bright, dark → dark).
 *   strength: opacity 0..1 (defaults to the registry entry's opacity).
 * @returns {{ id, url, label, color, opacity, bgBlend, blend } | null}
 */
export function resolveOverlay(id, opts = {}) {
  if (!id) return null;
  const key = String(id).trim().toLowerCase();
  const entry = OVERLAYS[key];
  if (!entry) return null;

  const color = opts.color || DEFAULT_OVERLAY_COLOR;
  const dark = colorLuminance(color) < 0.5;
  const strength = Number.isFinite(opts.strength) ? opts.strength : entry.opacity;
  const file = dark ? (entry.fileLight || entry.file) : entry.file;

  return {
    id: key,
    url: `${OVERLAY_BASE}/${file}`,
    label: entry.label,
    color,
    opacity: Math.max(0, Math.min(1, strength)),
    bgBlend: dark ? "screen" : "multiply", // tint the loop to `color`
    blend: dark ? "multiply" : "screen",   // composite tinted loop onto the artwork
  };
}
