/**
 * `unlisted_folders` (set in the vault's _bloob-settings.md): every page inside these folders is
 * unlisted — noindex, out of the sitemap, search, RSS, graph, and no third-party snippets —
 * whatever its own frontmatter says. Raw files in them get an X-Robots-Tag rule
 * (search-headers.js). See docs/architecture/security-by-obscurity.md.
 * Pure: values in, values out.
 */

/**
 * @param {string|string[]|null|undefined} value - the setting as written
 * @returns {string[]} folder paths without leading/trailing slashes, blanks dropped
 */
export function normalizeUnlistedFolders(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((f) => String(f).trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}

/**
 * @param {string} relativePath - vault-relative file path (either separator)
 * @param {string[]} folders - normalized unlisted folders
 * @returns {boolean} true when the file sits anywhere inside one of the folders (whole folder
 *   names, case-insensitive like the slugified URLs)
 */
export function isInUnlistedFolder(relativePath, folders) {
  if (!folders || folders.length === 0) return false;
  const p = String(relativePath).replace(/\\/g, "/").toLowerCase();
  return folders.some((f) => p.startsWith(`${f.toLowerCase()}/`));
}

/**
 * The single rule for "is this page unlisted?", used for the page's `_bloob_unlisted` flag,
 * graph.json and post-card excerpts alike: `visibility: unlisted`, `website_status: unlisted`,
 * the `#unlisted` tag, or living inside an `unlisted_folders` folder (which wins over the
 * page's own frontmatter).
 *
 * @param {{ frontmatter: object, tags: string[], relativePath: string, unlistedFolders: string[] }} page
 * @returns {boolean}
 */
export function isPageUnlisted({ frontmatter = {}, tags = [], relativePath = "", unlistedFolders = [] }) {
  return (
    frontmatter.visibility === "unlisted" ||
    frontmatter.website_status === "unlisted" ||
    tags.some((t) => t === "unlisted" || t === "#unlisted") ||
    isInUnlistedFolder(relativePath, unlistedFolders)
  );
}
