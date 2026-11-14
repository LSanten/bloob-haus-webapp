/**
 * The `license:` setting: what others may do with a site's writing.
 *
 * Site-wide: `license:` in `_bloob-settings.md` (or `site.license` in `sites/*.yaml`; the vault
 * wins). Per note: `license:` in the note's frontmatter overrides the site's for that page, and
 * `license: none` takes the page's license away.
 *
 * People write Creative Commons licenses many ways: `CC BY-NC-SA 4.0`, `CC-BY-NC-SA-4.0` (SPDX),
 * `cc by-nc-sa 4.0`, `Attribution-NonCommercial-ShareAlike 4.0 International`, or the deed URL.
 * All of them map to one plain name (`CC BY-NC-SA 4.0`, Creative Commons' own short form) and the
 * canonical creativecommons.org URL. Anything else is kept as written, with no link, and the build
 * warns, so a typo is visible instead of silently dropping the license.
 *
 * Pure: no I/O. The warning is the caller's (eleventy.config.js, assemble-src.js).
 */

const CC_BASE = "https://creativecommons.org";
// Versions that have all six BY licenses at /licenses/<code>/<version>/. 1.0 named them differently.
const CC_VERSIONS = new Set(["2.0", "2.5", "3.0", "4.0"]);
const CC_LATEST = "4.0";
const CC0 = { name: "CC0 1.0", url: `${CC_BASE}/publicdomain/zero/1.0/`, known: true };

// The long names on creativecommons.org, mapped to the short codes.
const LONG_WORDS = {
  attribution: "by",
  noncommercial: "nc",
  sharealike: "sa",
  noderivatives: "nd",
  noderivs: "nd",
};
// Words that say nothing about which license it is.
const FILLER = new Set(["international", "unported", "generic", "license", "licence", "deed", "legalcode"]);

/** `license: none` (or `false`): this page has no license, whatever the site says. */
export function isNoLicense(raw) {
  if (raw === false) return true;
  return typeof raw === "string" && /^(none|no|off|false)$/i.test(raw.trim());
}

function isBlank(raw) {
  return raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");
}

function ccLicense(code, version) {
  return {
    name: `CC ${code.toUpperCase()} ${version}`,
    url: `${CC_BASE}/licenses/${code}/${version}/`,
    known: true,
  };
}

/** Six valid sets: BY, plus at most one of NC, plus at most one of SA / ND. */
function ccCode(parts) {
  const set = new Set(parts);
  if (set.size !== parts.length || !set.has("by")) return null;
  if (set.has("sa") && set.has("nd")) return null;
  for (const p of set) if (!["by", "nc", "sa", "nd"].includes(p)) return null;
  return ["by", "nc", "sa", "nd"].filter((p) => set.has(p)).join("-");
}

function fromUrl(text) {
  const m = text.match(/^https?:\/\/(?:www\.)?creativecommons\.org\/(.+)$/i);
  if (!m) return null;
  const path = m[1].toLowerCase();
  if (/^publicdomain\/zero\/1\.0(\/|$)/.test(path)) return CC0;
  const lic = path.match(/^licenses\/([a-z-]+)\/(\d\.\d)(\/|$)/);
  if (!lic || !CC_VERSIONS.has(lic[2])) return null;
  const code = ccCode(lic[1].split("-"));
  return code ? ccLicense(code, lic[2]) : null;
}

function fromText(text) {
  const lower = text.toLowerCase().replace(/creative\s*commons/g, " cc ");

  // CC0: "CC0", "CC0 1.0", "CC0-1.0", "cc0 1.0 universal", "CC 0", "Creative Commons Zero".
  const compact = lower.replace(/[\s_\-–—]+/g, "");
  if (/^cc(0|zero)(v?1\.0)?(universal)?(publicdomaindedication)?$/.test(compact)) return CC0;

  const tokens = lower.split(/[\s_\-–—,()]+/).filter(Boolean);
  let hasCc = false;
  let longForm = false;
  let version = null;
  const parts = [];
  for (const raw of tokens) {
    const t = raw.replace(/\.$/, "");
    if (t === "cc") hasCc = true;
    else if (FILLER.has(t)) continue;
    else if (/^\d(\.\d)?$/.test(t)) {
      if (version) return null;
      version = t.includes(".") ? t : `${t}.0`;
    } else if (LONG_WORDS[t]) {
      longForm = true;
      parts.push(LONG_WORDS[t]);
    } else parts.push(t);
  }
  // "BY 4.0" alone is too thin to call a license: it needs "CC" or the long names.
  if (!hasCc && !longForm) return null;
  const code = ccCode(parts);
  if (!code) return null;
  const v = version || CC_LATEST;
  return CC_VERSIONS.has(v) ? ccLicense(code, v) : null;
}

/**
 * Read one written license.
 *
 * @param {unknown} raw - the value as written (`CC BY-NC-SA 4.0`, a URL, anything)
 * @returns {{name: string, url: string|null, known: boolean}|null}
 *   null when nothing is set or it says none; `known: false` (no url) when not recognised.
 */
export function parseLicense(raw) {
  if (isBlank(raw) || isNoLicense(raw)) return null;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim().replace(/\s+/g, " ");
  return fromUrl(text) || fromText(text) || { name: text, url: null, known: false };
}

/**
 * The license that applies to one page: its own `license:` if it has one, else the site's.
 *
 * @param {unknown} pageRaw - the note's frontmatter `license:` (undefined when absent)
 * @param {{name: string, url: string|null}|null} siteLicense - the site's, already parsed
 * @returns {{name: string, url: string|null, known: boolean}|null}
 */
export function pageLicense(pageRaw, siteLicense) {
  if (isBlank(pageRaw)) return siteLicense || null;
  return parseLicense(pageRaw);
}
