/**
 * Opening tag for a `::: name [key=value …]` section container.
 *
 * Everything in `info` is author-controlled fence text. The class and every
 * setting are escaped so a fence like `::: x" onmouseover="…` cannot break out
 * of the tag. Settings stay a SINGLE-QUOTED JSON attribute because visualizer
 * index.js files regex-match `data-vis-settings='([^']+)'` and JSON.parse the
 * capture — so ' < > & are neutralised with JSON \u escapes, never HTML
 * entities (entities would break that JSON.parse).
 *
 * Defence in depth, not the front door: the Eleventy markdown-it runs with
 * html:true, so an author can write raw HTML directly. This module only makes
 * the container renderer itself unable to emit an unintended attribute.
 */

const KV = /([\w-]+)=(?:"([^"]*)"|([\S]*))/g;
const B64 = /^[A-Za-z0-9+/=]*$/;

/** For DOUBLE-quoted attributes and text only — does not escape `'`. */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON that is safe inside a single-quoted HTML attribute and still plain JSON.parse-able. */
export function jsonAttr(obj) {
  return JSON.stringify(obj)
    .replace(/'/g, "\\u0027")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * @param {string} rawInfo  the fence info string, e.g. `image-grid title="Our Team" _raw=aGVsbG8=`
 * @returns {{ cls: string, settings: Record<string, string>, raw: string | null, rawSource: string | null }}
 *   `raw`/`rawSource` are the base64 payloads injected by inject-container-raw.js, removed from
 *   `settings`; a non-base64 value in those slots is dropped with a warning.
 */
export function parseSectionInfo(rawInfo) {
  const info = String(rawInfo ?? "").trim();
  const spaceIdx = info.indexOf(" ");
  if (spaceIdx === -1) return { cls: info, settings: {}, raw: null, rawSource: null };
  const cls = info.slice(0, spaceIdx);
  const settings = {};
  const settingsStr = info.slice(spaceIdx + 1).trim();
  let m;
  KV.lastIndex = 0;
  while ((m = KV.exec(settingsStr)) !== null) {
    settings[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  const take = (key) => {
    const v = settings[key];
    delete settings[key];
    if (typeof v !== "string") return null;
    if (B64.test(v)) return v;
    // A build-time visualizer will now see no data-vis-raw and skip its transform —
    // say so, rather than emitting a value that could carry a quote into the tag.
    console.warn(`[section-container] dropped non-base64 ${key} on ::: ${cls}`);
    return null;
  };
  const raw = take("_raw");
  const rawSource = take("_rawsource");
  return { cls, settings, raw, rawSource };
}

export function renderSectionOpen(rawInfo) {
  const { cls, settings, raw, rawSource } = parseSectionInfo(rawInfo);
  const settingsAttr = Object.keys(settings).length ? ` data-vis-settings='${jsonAttr(settings)}'` : "";
  const rawAttr = raw ? ` data-vis-raw="${raw}"` : "";
  const rawSourceAttr = rawSource ? ` data-vis-raw-source="${rawSource}"` : "";
  return `<section class="${escapeHtml(cls)}"${settingsAttr}${rawAttr}${rawSourceAttr}>\n`;
}
