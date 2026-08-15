/**
 * safeDecode — percent-decoding that cannot abort a build.
 *
 * `decodeURIComponent` throws `URIError: URI malformed` whenever a `%` is not the start of
 * a valid escape sequence. A literal `%` is legal in a filename on every filesystem and is
 * entirely plausible in a vault — "50% off flyer.png" — so the pipeline's many decode sites
 * were each a way to take the whole build down with an error naming neither the offending
 * file nor the step that choked on it.
 *
 * An undecodable string is far more likely to be a literal percent than a typo, so returning
 * it verbatim is the *correct* interpretation as well as the safe one: the raw name is what
 * the basename/vault-path lookups should be matching against anyway.
 *
 * This is a pure widening of `decodeURIComponent` — for every input that did not throw, the
 * return value is byte-identical. Only the crash path changes.
 *
 * Node-side only. `lib/visualizers/**` is browser-bundled and must not import from `scripts/`,
 * so scene-nav keeps its own copy in `lib/visualizers/scene-nav/decode.js` alongside the
 * `encodeRef`/`encodeGotoRaw` pair it belongs with. That duplication is deliberate.
 *
 * @param {string} value
 * @returns {string} the decoded string, or `value` unchanged if it is not valid encoding
 */
export function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
