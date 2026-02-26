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
