/**
 * Scene Nav — ref encoding.
 *
 * `safeDecode` / `encodeRef` are shared with other shapes and live in
 * `_utils/ref-encoding.js`; they are re-exported here so scene-nav's own modules have one
 * import site. `encodeGotoRaw` is scene-nav's alone — no other shape has a `goto:` grammar.
 *
 * The pair is symmetric and that symmetry is the contract:
 *   - refs are **decoded** on the way in, so resolution never thinks about encoding;
 *   - refs are **encoded** on the way out, so what a builder emits resolves in Obsidian.
 * See shapes.md → "Authoring & resolution conventions" #4.
 */

import { safeDecode, encodeRef } from "../_utils/ref-encoding.js";

export { safeDecode, encodeRef };

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
