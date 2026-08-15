/**
 * Scene Nav — ref encoding helpers (pure, no imports).
 *
 * Kept separate from parser.js so resolve.js stays import-free (see visualizers.md
 * → "resolve.js — the only host-dependent seam").
 *
 * The pair is symmetric and that symmetry is the contract:
 *   - refs are **decoded** on the way in, so resolution never thinks about encoding;
 *   - refs are **encoded** on the way out, so what a builder emits resolves in Obsidian.
 * See shapes.md → "Authoring & resolution conventions" #4.
 */

/**
 * Percent-decode a ref without ever throwing.
 *
 * `decodeURIComponent` throws URIError on a literal `%` that is not a valid escape —
 * "50% off flyer.png" is a plausible filename and used to abort the entire build with
 * an error naming neither the file nor the shape. An undecodable ref is far more likely
 * to be a literal percent than a typo, so returning it verbatim is also the correct
 * interpretation, not just the safe one.
 *
 * @param {string} value
 * @returns {string}
 */
export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
