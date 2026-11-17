/**
 * Letter — the webapp's side of the shape. The drawing itself is in renderer.js (the envelope) and
 * paper.js (the sheet), both pure and copied as they are into the post office; this file is only
 * how the hosts in THIS repo use them, and is not copied.
 *
 * Activation:
 *   ---
 *   bloob-shape: letter
 *   to: Whitney
 *   from: Leon
 *   timing: no-rush
 *   ---
 *   What you write here is the paper inside.
 *
 * Sealing, tearing open and lockers are the post office's (bloob-haus-cloud), not this file's.
 */
import { renderClosed } from "./renderer.js";
import { renderPaper, renderPaperBody } from "./paper.js";

export const type = "file-scope";
export const name = "letter";

/** A note's frontmatter as an envelope: flat, every value a string, nothing empty. */
export function envelopeOf(data = {}) {
  const env = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null || typeof value === "object") continue;
    const text = String(value).trim();
    if (text) env[key] = text;
  }
  return env;
}

/**
 * A whole note drawn as a letter, for a host with no opening of its own (the visualizer editor):
 * the envelope above, the paper below, there at once. The envelope is drawn as its frontmatter
 * says, so a note that carries `opened:` shows it torn, with the top of its paper in it.
 * @param {{ data: object, body: string }} note the frontmatter and the markdown under it
 * @param {{ here?: string }} [where] the host the page is drawn on, for links
 */
export function renderNote({ data, body }, { here } = {}) {
  const envelope = envelopeOf(data);
  const inside = { html: renderPaperBody(body || "", here) };
  return `<div class="bh-letter"><div class="bh-letter__outside">${renderClosed(envelope, inside)}</div>${renderPaper(envelope, body || "", { here })}</div>`;
}

/**
 * The site builder does not draw letters yet: a vault note that names this shape stays the normal
 * page it is today. (Without this, the builder would look for a layouts/letter.njk that does not
 * exist.) What a letter looks like on a public haus is still to be decided; see schema.md.
 */
export function renderFilescope(_settings, body) {
  return body;
}
