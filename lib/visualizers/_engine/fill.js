/**
 * Fills a template's blanks. Logic-less on purpose: no ifs, no loops, no expressions, so a
 * template from anyone is safe to run anywhere.
 *
 *   {{ name }}       an escaped value
 *   {{ yaml.key }}   an escaped frontmatter value
 *   {{ body }}       the note's rendered body, as HTML
 *   {{ inside }}     a nested object's open part, as HTML
 *
 * An unknown blank becomes nothing.
 */

const RAW = new Set(["body", "inside"]);
const BLANK = /\{\{\s*([A-Za-z_][\w-]*(?:\.[\w-]+)?)\s*\}\}/g;

/**
 * @param {string} template
 * @param {object} blanks
 * @returns {string}
 */
export function fillTemplate(template, blanks) {
  return template.replace(BLANK, (_, name) => {
    const value = name.startsWith("yaml.") ? blanks.yaml?.[name.slice(5)] : blanks[name];
    if (value === undefined || value === null) return "";
    return RAW.has(name) ? String(value) : escapeHtml(value);
  });
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
