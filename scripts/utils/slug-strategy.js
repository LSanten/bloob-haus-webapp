/**
 * Slug Strategy
 * Configurable URL slug generation strategies.
 *
 * Strategies:
 *   - "slugify" (default): lowercase, remove special chars, spaces → hyphens
 *   - "preserve-case": keep original casing, spaces → hyphens, remove only URL-unsafe chars
 */

/**
 * Standard slugify — lowercase, ASCII-only, hyphens for spaces.
 * Used by buffbaby and as the default.
 */
function slugifyStandard(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Preserve-case — keeps original casing, replaces spaces with hyphens,
 * removes only characters that are unsafe in URLs.
 */
function slugifyPreserveCase(str) {
  return str
    .replace(/[^a-zA-Z0-9\s._-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns the slug function for a given strategy name.
 * @param {string} strategy - "slugify" or "preserve-case"
 * @returns {function} The slug function
 */
export function getSlugFunction(strategy) {
  switch (strategy) {
    case "preserve-case":
      return slugifyPreserveCase;
    case "slugify":
    default:
      return slugifyStandard;
  }
}

/**
 * Slugifies a relative path one segment at a time.
 *
 * THE canonical way to turn a vault folder path into a URL path. Every consumer
 * must go through this — a URL derived any other way will disagree with the rest
 * of the site.
 *
 * This exists because folder-index permalinks used to be pinned from the raw
 * directory name (`"/" + dir + "/"`) while leaf pages went through the slug
 * strategy. On a `case: lower` site that produced "/Resources/" for the folder
 * and "/resources/playlists/" for its children. macOS hides the split — its
 * filesystem is case-insensitive, so both collapse into one directory — but a
 * Linux CI build writes two, and links between them 404.
 *
 * Segment-by-segment (not one slugify over the whole string) so "/" survives as
 * a path separator instead of being eaten as a special character.
 *
 * @param {string} relPath - Vault-relative folder path ("Resources/Deep Folder")
 * @param {string} [strategy] - "slugify" or "preserve-case"
 * @returns {string} Slugified path with no leading/trailing slash ("resources/deep-folder")
 */
export function slugifyPath(relPath, strategy) {
  if (!relPath) return "";
  const slugFn = getSlugFunction(strategy);
  return String(relPath)
    .replace(/\\/g, "/")
    .split("/")
    .filter((seg) => seg && seg !== ".")
    .map(slugFn)
    .join("/");
}

/**
 * Slugify a heading for use as an anchor (always lowercase).
 * This is shared between wiki-link-resolver and markdown-link-resolver.
 */
export function slugifyHeading(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
