/**
 * Letter — the webapp's side of the shape. The drawing itself is in renderer.js (the envelope) and
 * paper.js (the sheet), both pure and copied as they are into the post office; this file is only
 * how the hosts in THIS repo use them (a haus built by the site builder, and the visualizer
 * editor), and is not copied.
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
 * A letter on a haus is the envelope above and its open paper below, both there at once: no
 * script, no tearing. Sealing, tearing open and lockers are the post office's (bloob-haus-cloud).
 */
import { renderClosed } from "./renderer.js";
import { renderPaper } from "./paper.js";

export const type = "file-scope";
export const name = "letter";

/**
 * What a haus writes on the envelope: these keys and no others (Leon, 2026-11-16: "keep it tight
 * and only allow certain YAML"). A note's other frontmatter (title, tags, visibility, dates, a
 * recipe's servings) is about the page, not something its writer put on an envelope. The post
 * office's own envelopes are not held to this list: there the writer typed every key on purpose.
 */
export const ENVELOPE_KEYS = ["to", "from", "intention", "need", "timing", "envelope_note"];
// Typed at the top of the envelope, where a new line is a new line. to, from and the stamp are one line each.
const MANY_LINES = new Set(["intention", "need", "envelope_note"]);

/** A frontmatter value as lines of text: a string (a YAML block keeps its line breaks) or a list of them. */
function linesOf(value) {
  const items = Array.isArray(value) ? value : [value];
  return items
    .filter((v) => v != null && typeof v !== "object")
    .flatMap((v) => String(v).split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The envelope a haus draws from a note's frontmatter: the fixed keys, flat strings, nothing empty. */
export function hausEnvelope(data = {}) {
  const env = {};
  for (const key of ENVELOPE_KEYS) {
    const lines = linesOf(data[key]);
    if (lines.length) env[key] = MANY_LINES.has(key) ? lines.join("\n") : lines.join(key === "timing" ? " " : ", ");
  }
  return env;
}

/** A day (YYYY-MM-DD) from a frontmatter date: a string, quoted or not, a YAML date, or a list (the latest). */
export function dayOf(value) {
  const days = (Array.isArray(value) ? value : [value])
    .map((v) => (v instanceof Date && !isNaN(v) ? v.toISOString() : typeof v === "string" ? v : ""))
    .map((s) => /(\d{4}-\d{2}-\d{2})(?!\d)/.exec(s)?.[1])
    .filter(Boolean)
    .sort();
  return days[days.length - 1];
}

// The renderer says what its drawing shows: a sealed envelope. Here the paper lies open below it,
// so the words for the ear say that instead. letter.test.js fails if the renderer's wording moves.
const SEALED_WORDS = `<p class="bh-env__status">A letter, sealed, not opened yet.</p>`;
const HAUS_WORDS = `<p class="bh-env__status">A letter. Its envelope, and below it the paper inside.</p>`;

/**
 * A whole note drawn as a letter: the envelope above, the open paper below. No office postmark (a
 * postmark says a post office handled the letter); the paper's date line says when it was written
 * and last updated instead.
 * @param {{ data: object, body: string }} note the frontmatter and the markdown under it
 * @param {{ here?: string }} [where] the host the page is drawn on, for links
 */
export function renderNote({ data = {}, body }, { here } = {}) {
  const envelope = hausEnvelope(data);
  const dates = { written: dayOf(data.date_created), updated: dayOf(data.date_updated) };
  return (
    `<div class="bh-letter"><div class="bh-letter__outside">${renderClosed(envelope).replace(SEALED_WORDS, HAUS_WORDS)}</div>` +
    `${renderPaper(envelope, body || "", { here, dates })}</div>`
  );
}

/**
 * The site builder's hook: the page's body becomes the letter. The builder hands the frontmatter
 * as a third argument; a host that does not (an older caller) gets the body back untouched.
 * The HTML goes through markdown-it next, which ends an HTML block at an empty line, so empty
 * lines (in a code block on the paper) are written as a line-break character instead.
 */
export function renderFilescope(_settings, body, { frontmatter } = {}) {
  if (!frontmatter) return body;
  return renderNote({ data: frontmatter, body }).replace(/\n(?=\n)/g, "&#10;");
}
