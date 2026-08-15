/**
 * Redirect Resolver
 *
 * Resolves a `redirect:` (or `Redirect:`) frontmatter value to a clean URL.
 *
 * Supported formats:
 *   https://example.com          → bare URL, used as-is
 *   [[page-name]]                → resolved to internal URL via fileIndex
 *   [[page-name#heading]]        → internal URL with heading anchor
 *   [text](https://example.com)  → markdown link, URL extracted
 *
 * Returns null if the value is absent or a wiki-link that can't be resolved.
 *
 * @param {string|undefined} value - Raw redirect value from frontmatter
 * @param {Object} fileIndex - File index from buildFileIndex()
 * @returns {string|null} Resolved URL, or null
 */

import { safeDecode } from "./safe-decode.js";
export function resolveRedirect(value, fileIndex) {
  if (!value) return null;
  const s = String(value).trim();

  // [[wiki-link]] or [[wiki-link#heading]]
  const wikiMatch = s.match(/^\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]+)?\]\]$/);
  if (wikiMatch) {
    const target = wikiMatch[1].trim();
    const heading = wikiMatch[2];
    const url = lookupPageUrl(target, fileIndex);
    if (!url) return null;
    return heading ? `${url}#${heading}` : url;
  }

  // [text](url) markdown link — extract the URL, resolve .md filenames via fileIndex
  const mdMatch = s.match(/^\[.*?\]\((.+?)\)$/);
  if (mdMatch) {
    const target = safeDecode(mdMatch[1]);
    if (target.endsWith(".md")) {
      const filename = target.replace(/^.*\//, "").replace(/\.md$/, "");
      return lookupPageUrl(filename, fileIndex) || null;
    }
    return target;
  }

  // Bare URL or path
  return s;
}

/**
 * Looks up a wiki-link target in the file index and returns its URL.
 * Mirrors the lookup strategy in wiki-link-resolver.js.
 *
 * @param {string} target - Link target (title or filename, no .md extension)
 * @param {Object} fileIndex
 * @returns {string|null}
 */
function lookupPageUrl(target, fileIndex) {
  const normalized = target.toLowerCase().replace(/\.md$/, "");

  if (fileIndex.titleLookup?.[normalized]) {
    const fullSlug = fileIndex.titleLookup[normalized];
    return fileIndex.pages?.[fullSlug]?.url || null;
  }

  if (fileIndex.pages?.[normalized]) {
    return fileIndex.pages[normalized].url;
  }

  return null;
}
