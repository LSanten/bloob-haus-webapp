/**
 * ref-encoding.js — shared percent-encoding helpers for shapes that carry image refs
 *
 * Implements the storage/emission half of the authoring contract
 * (docs/architecture/shapes.md → "Authoring & resolution conventions" #4):
 *
 *   refs are STORED decoded  → resolution never has to think about encoding
 *   refs are EMITTED encoded → what a builder writes back resolves in Obsidian,
 *                              and what a renderer emits is a valid URL
 *
 * Used by `scene-nav` (markdown-link refs) and `garden` (`src:` attributes). Pure, no
 * imports, no DOM — safe in a browser bundle, in Node, and in tests.
 *
 * `scripts/utils/safe-decode.js` is the Node-side twin. The duplication is deliberate:
 * `lib/visualizers/**` is bundled for the browser and must never import from `scripts/`.
 */

/**
 * Percent-decode a ref without ever throwing.
 *
 * `decodeURIComponent` throws `URIError: URI malformed` whenever a `%` is not the start of
 * a valid escape. A literal `%` is legal in a filename on every filesystem and plausible in
 * a vault ("50% off flyer.png"), so an unguarded call is a way to take a whole build down.
 *
 * Returning the raw string is also the *correct* reading, not merely the safe one: an
 * undecodable ref is far likelier to be a literal percent than a typo, and the raw name is
 * what the basename lookup should be matching anyway.
 *
 * This is a pure widening of `decodeURIComponent` — for every input that did not throw the
 * result is byte-identical. Only the crash path changes.
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

/**
 * Percent-encode a vault-relative ref for emission (into markdown, or into an `<img src>`).
 *
 * Encodes per path segment so `/` keeps separating folders. Absolute URLs and `data:` URIs
 * are already valid and pass through untouched.
 *
 * Symmetric with `safeDecode`: encode(decode(x)) is stable, and an already-encoded ref does
 * not become `%2520` provided it was decoded on the way in.
 *
 * @param {string} ref - a decoded ref, as held in the parsed model
 * @returns {string}
 */
export function encodeRef(ref) {
  if (!ref) return ref;
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) return ref;
  return ref.split("/").map(encodeURIComponent).join("/");
}
