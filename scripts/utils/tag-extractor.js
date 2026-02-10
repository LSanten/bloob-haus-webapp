/**
 * Tag Extractor Module
 * Extracts and normalizes tags from Obsidian markdown frontmatter and inline content.
 * Standalone utility with no Eleventy dependencies.
 */

/**
 * Regex for inline Obsidian-style tags.
 * Matches #tag, #multi-word-tag, #nested/tag, #recipe/dessert/chocolate
 * Must start with a letter (avoids matching #123 hex colors, headings, etc.)
 * Preceded by whitespace or start of line (avoids matching inside URLs)
 */
const INLINE_TAG_REGEX = /(?:^|\s)#([a-zA-Z][\w/-]*)/g;

/**
 * System tags used for publishing logic, not content taxonomy.
 * Stripped from the public tag list.
 */
const SYSTEM_TAGS = new Set([
  'not-for-public',
  'gardenentry',
  'all',
  'nav',
]);

/**
 * Extract tags from a page's frontmatter and markdown content.
 *
 * Handles:
 * - Frontmatter `tags` as array: `tags: ["#vegan", "stir-fry", "#baked-goods"]`
 * - Frontmatter `tags` as string: `tags: recipe`
 * - Inline #tags in markdown body: `This is a #recipe for #vegan cake`
 * - Nested/hierarchical tags: `#recipe/dessert/chocolate`
 * - Tags with or without # prefix in frontmatter
 *
 * @param {Object} frontmatter - Parsed YAML frontmatter object
 * @param {string} content - Raw markdown body (after frontmatter)
 * @returns {string[]} Normalized, deduplicated, sorted array of tags (without # prefix)
 */
export function extractTags(frontmatter, content) {
  let tags = [];

  // 1. Frontmatter tags (array or single string)
  if (Array.isArray(frontmatter.tags)) {
    tags = [...frontmatter.tags];
  } else if (typeof frontmatter.tags === 'string') {
    tags = [frontmatter.tags];
  }

  // 2. Inline #tags from content body
  let match;
  while ((match = INLINE_TAG_REGEX.exec(content)) !== null) {
    tags.push(match[1]);
  }

  // 3. Normalize: strip # prefix, lowercase, trim, deduplicate, filter system tags
  const normalized = [...new Set(
    tags
      .map(t => t.replace(/^#/, '').toLowerCase().trim())
      .filter(t => t.length > 0 && !SYSTEM_TAGS.has(t))
  )].sort();

  return normalized;
}

/**
 * Build a global tag index from all published pages.
 * Used to generate tagIndex.json for the tag cloud and tag index page.
 *
 * @param {Object[]} allPages - Array of { title, url, tags, excerpt }
 * @returns {Object} Tag index: { tagName: { count, pages: [{ title, url, excerpt }] } }
 */
export function buildTagIndex(allPages) {
  const tagIndex = {};

  for (const page of allPages) {
    if (!page.tags || page.tags.length === 0) continue;

    for (const tag of page.tags) {
      if (!tagIndex[tag]) {
        tagIndex[tag] = { count: 0, pages: [] };
      }
      tagIndex[tag].count++;
      tagIndex[tag].pages.push({
        title: page.title,
        url: page.url,
        excerpt: page.excerpt || '',
      });
    }
  }

  // Sort by count descending
  return Object.fromEntries(
    Object.entries(tagIndex).sort((a, b) => b[1].count - a[1].count)
  );
}
