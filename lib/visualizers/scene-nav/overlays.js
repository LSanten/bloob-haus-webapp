/**
 * Scene-nav curated overlay loops.
 *
 * Bundled B&W animated loops that render *only where an element's artwork has
 * opaque pixels* (alpha-masked) with a `screen` blend — the Studio Bloob shop
 * technique (see docs/footer-waterdog-overlay.md in the studio-bloob theme).
 * Files live in assets/overlays/ and are copied by bundle-visualizers.js to
 * /assets/visualizers/scene-nav/overlays/<file>. Authors opt in per element with
 * the grammar `overlay: <id>`; the builder dropdown (Phase B) lists these too.
 *
 * Pure module — safe to import from the renderer and the browser builder.
 * To add a loop: drop a file in assets/overlays/ and add a registry entry.
 */

export const OVERLAY_BASE = "/assets/visualizers/scene-nav/overlays";

export const OVERLAYS = {
  water: { file: "water.gif", label: "Moving water", opacity: 0.7, blend: "screen" },
};

/**
 * Resolve a grammar overlay id to its render params, or null if empty/unknown.
 * Case-insensitive; trims whitespace.
 * @param {string|null|undefined} id
 * @returns {{ id: string, url: string, label: string, opacity: number, blend: string } | null}
 */
export function resolveOverlay(id) {
  if (!id) return null;
  const key = String(id).trim().toLowerCase();
  const entry = OVERLAYS[key];
  if (!entry) return null;
  return {
    id: key,
    url: `${OVERLAY_BASE}/${entry.file}`,
    label: entry.label,
    opacity: entry.opacity,
    blend: entry.blend,
  };
}
