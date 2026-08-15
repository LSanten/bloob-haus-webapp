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

/**
 * Percent-encode a vault-relative image ref for emission into markdown.
 *
 * The builder's "Copy ::: block" output is pasted back into an Obsidian vault, where a
 * markdown link with literal spaces does not resolve — the author sees a broken link in
 * the editor even though the site builds correctly. Emitting the encoded form makes one
 * string work in both hosts. `parser.js` decodes on the way in, so this is symmetric and
 * the round-trip is stable.
 *
 * Encodes per path segment so `/` keeps separating folders. Absolute URLs and data: URIs
 * are already valid and are passed through untouched.
 *
 * @param {string} ref - a decoded ref, as held in the parsed model
 * @returns {string}
 */
export function encodeRef(ref) {
  if (!ref) return ref;
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) return ref;
  return ref.split("/").map(encodeURIComponent).join("/");
}

/**
 * Encode spaces inside a markdown-link `goto:` target, leaving everything else verbatim.
 *
 * Two grammars, two rules (shapes.md → "Authoring & resolution conventions" #6):
 *
 *   [[an evening with melt]]          wiki-link — Obsidian's own syntax. Spaces are legal and
 *                                     `%20` would make it hunt for a file literally named
 *                                     "an%20evening...". NEVER touched.
 *   [label](an evening with melt.md)  CommonMark link destination — a raw space terminates it,
 *                                     so the link does not resolve in Obsidian. Target encoded.
 *
 * Absolute URLs, anchors and bare values are already valid and pass through untouched. The label
 * is never modified — only the target inside the parentheses.
 *
 * @param {string} raw - the authored goto string, exactly as typed
 * @returns {string}
 */
export function encodeGotoRaw(raw) {
  if (!raw) return raw;
  const md = raw.match(/^\[(.*?)\]\((.+)\)$/);
  if (!md) return raw; // wiki-link, anchor, bare value — all verbatim

  const [, label, target] = md;
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(target)) return raw; // scheme, anchor, query

  // safeDecode first so an already-encoded target does not become %2520.
  return `[${label}](${encodeRef(safeDecode(target))})`;
}
