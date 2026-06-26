/**
 * Slug strategies for permalink generation.
 * Must match the strategies in scripts/utils/slug-strategy.js.
 */
function slugifyStandard(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugifyPreserveCase(str) {
  return str
    .replace(/[^a-zA-Z0-9\s._-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getSlugFn(strategy) {
  switch (strategy) {
    case "preserve-case":
      return slugifyPreserveCase;
    case "slugify":
    default:
      return slugifyStandard;
  }
}

// Jekyll-style date prefix. Kept in sync with scripts/utils/date-prefix.js —
// duplicated here because this file is copied standalone into each per-site
// src-(site)/_data/ dir and cannot import from scripts/.
const DATE_PREFIX_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(.+)$/;

function stripDatePrefix(filename) {
  const m = String(filename).match(DATE_PREFIX_RE);
  return m ? m[4] : filename;
}

export default {
  eleventyExcludeFromCollections: (data) => {
    if (data._bloob_unlisted) return true;
    return data.eleventyExcludeFromCollections || false;
  },

  permalink: (data) => {
    // If the page has an explicit permalink in frontmatter, use it
    if (data.permalink && data.permalink !== true) return data.permalink;

    // Only modify permalinks for pages with a fileSlug (content pages)
    if (!data.page.fileSlug) return data.permalink;

    const strategy = data.site?.permalinks?.strategy || "slugify";
    const slugFn = getSlugFn(strategy);
    const pathParts = data.page.filePathStem.split("/").filter(Boolean);
    const sectionParts = pathParts.slice(0, -1);
    let filename = pathParts[pathParts.length - 1];

    // Opt-in (off by default): strip a leading YYYY-MM-DD- so the URL is clean
    // ("my-post"). Independent of features.date_from_filename, which only sets
    // date_created and leaves the date in the URL.
    if (data.site?.features?.date_prefix_slugs) {
      filename = stripDatePrefix(filename);
    }

    const slug = slugFn(filename);
    const section = sectionParts.map(slugFn).join("/");

    if (section) {
      return `/${section}/${slug}/`;
    }
    return `/${slug}/`;
  },
};
