/**
 * award-badge parser — pure functions
 *
 * Frontmatter, one line per entry, positional like a function call:
 *   awards:
 *     - ASHRAE Technology Award, Region X, 2025, 1, https://www.ashrae.org/
 *   certifications:
 *     - LEED, Gold, 2023
 *
 *   awards:          NAME, LEVEL, YEAR, PLACE, LINK
 *   certifications:  NAME, LEVEL, YEAR, LINK
 *
 * Forgiving: trailing parts may be left off; a 4-digit year is found in any
 * position; LINK (http/https) is found in any position; PLACE may be "1",
 * "1st" or "First Place". A plain string instead of a list is accepted.
 * The one rule: no commas inside a part.
 */

const YEAR = /^(19|20)\d\d$/;
const LINK = /^https?:\/\/\S+$/i;
const WORD_RANK = { first: 1, second: 2, third: 3 };

export function asList(value) {
  if (value == null || value === "") return [];
  return (Array.isArray(value) ? value : [value]).filter((v) => v != null && String(v).trim() !== "");
}

export function parseRank(place) {
  if (!place) return null;
  const m = String(place).trim().match(/^(\d+)|^(first|second|third)\b/i);
  if (!m) return null;
  return m[1] ? Number(m[1]) : WORD_RANK[m[2].toLowerCase()];
}

/**
 * @param {string} line
 * @param {"award"|"cert"} kind
 */
export function parseLine(line, kind = "award") {
  const parts = String(line ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const out = { kind, name: "", level: "", year: "", place: "", rank: null, link: "" };

  const yi = parts.findIndex((p) => YEAR.test(p));
  if (yi > -1) out.year = parts.splice(yi, 1)[0];
  const li = parts.findIndex((p) => LINK.test(p));
  if (li > -1) out.link = parts.splice(li, 1)[0];

  out.name = parts[0] || "";
  out.level = parts[1] || "";
  if (kind === "award") {
    out.place = parts[2] || "";
    out.rank = parseRank(out.place);
  }
  return out;
}

/**
 * @param {{ awards?: unknown, certifications?: unknown }} fm
 * @returns {object[]} entries with a name, awards first
 */
export function parseEntries(fm = {}) {
  return [
    ...asList(fm.awards).map((l) => parseLine(l, "award")),
    ...asList(fm.certifications).map((l) => parseLine(l, "cert")),
  ].filter((e) => e.name);
}
