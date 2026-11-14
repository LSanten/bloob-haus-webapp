/**
 * schema.org JSON-LD: one block per page.
 *
 * Two sources feed it:
 *   - the site's `structured-data` fence in _bloob-settings.md: who the site belongs to (a Person,
 *     a business), written once for every page;
 *   - the page itself, when it has a license (scripts/utils/license.js).
 * With only the fence, the block is the fence, as before. With a license too, both go into one
 * `@graph`, so a page never carries two JSON-LD blocks that could disagree.
 *
 * Rendered by themes/_base/partials/structured-data.njk.
 */

const SCHEMA = "https://schema.org";
const SAME_CONTEXT = new Set(["https://schema.org", "https://schema.org/", "http://schema.org", "http://schema.org/"]);

/**
 * The fence's JSON (JSON only, no <script> tag). Null, with a warning, when it doesn't parse: a
 * typo must not break every page's <head>.
 *
 * @param {string|undefined} raw - fence content
 * @returns {object|object[]|null}
 */
export function parseStructuredData(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch (error) {
    console.warn(`[settings] structured-data is not valid JSON, skipped: ${error.message}`);
    return null;
  }
}

/**
 * The page as a schema.org WebPage carrying its license, or null when it has none.
 *
 * @param {{name: string, url: string|null}|null} license
 * @param {string} url - the page's absolute URL
 * @param {string} [title]
 */
export function licensedPageNode(license, url, title) {
  if (!license) return null;
  const node = { "@type": "WebPage", url };
  if (title) node.name = String(title);
  // schema.org `license` takes a URL or a CreativeWork; a license with no known URL is named.
  node.license = license.url || { "@type": "CreativeWork", name: license.name };
  return node;
}

const withoutSchemaContext = (node) => {
  if (!node || typeof node !== "object" || !SAME_CONTEXT.has(node["@context"])) return node;
  const { "@context": _context, ...rest } = node;
  return rest;
};

/**
 * Site data and page node merged into one JSON-LD value.
 *
 * @param {object|object[]|null} siteData - parsed fence
 * @param {object|null} pageNode - from licensedPageNode
 * @returns {object|object[]|null}
 */
export function mergeStructuredData(siteData, pageNode) {
  if (!pageNode) return siteData || null;
  if (!siteData) return { "@context": SCHEMA, ...pageNode };
  const nodes = Array.isArray(siteData) ? siteData : Array.isArray(siteData["@graph"]) ? siteData["@graph"] : [siteData];
  return { "@context": SCHEMA, "@graph": [...nodes.map(withoutSchemaContext), pageNode] };
}

/**
 * A JSON-LD script tag, minified, or "" when there is nothing. `<` is escaped as < so a
 * value containing "</script>" can't close the tag early.
 *
 * @param {object|object[]|null} data
 * @returns {string}
 */
export function jsonLdScript(data) {
  if (!data) return "";
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}
