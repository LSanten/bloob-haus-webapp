/**
 * Opening tag for a `::: name [key=value …]` section container.
 *
 * Everything in `info` is author-controlled fence text. The class and every
 * setting are escaped so a fence like `::: x" onmouseover="…` cannot break out
 * of the tag. Settings stay a SINGLE-QUOTED JSON attribute because visualizer
 * index.js files regex-match `data-vis-settings='([^']+)'` and JSON.parse the
 * capture — so ' < > & are neutralised with JSON \u escapes, never HTML
 * entities (entities would break that JSON.parse).
 */

const KV = /([\w-]+)=(?:"([^"]*)"|([\S]*))/g;
const B64 = /^[A-Za-z0-9+/=]*$/;

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
  // _raw / _rawsource are injected by inject-container-raw.js as base64; anything
  // else in those slots is dropped rather than emitted.
  const take = (key) => {
    const v = settings[key];
    delete settings[key];
    return typeof v === "string" && B64.test(v) ? v : null;
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
