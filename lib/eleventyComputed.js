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

export default {
  eleventyExcludeFromCollections: (data) => {
    if (data._bloob_unlisted) return true;
    return data.eleventyExcludeFromCollections || false;
  },

  // Canonical page ID — lowercased `host + path`, no scheme/trailing slash. Honors a
  // `bloob-page-id` frontmatter override so a note that moved can re-attach its comments to
  // the old ID (see docs/architecture/urls-and-ids.md). Keep the derivation in sync with
  // scripts/utils/page-id.js (this file is copied into src/_data and can't import from repo).
  bloobPageId: (data) => {
    const override = data["bloob-page-id"];
    if (override) return String(override).trim().toLowerCase().replace(/\/+$/, "");
    let host;
    try {
      host = new URL(data.site?.url || "").host;
    } catch {
      host = String(data.site?.url || "").replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
    }
    return (host + (data.page?.url || "")).toLowerCase().replace(/\/+$/, "");
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
    const filename = pathParts[pathParts.length - 1];

    const slug = slugFn(filename);
    const section = sectionParts.map(slugFn).join("/");

    if (section) {
      return `/${section}/${slug}/`;
    }
    return `/${slug}/`;
  },
};
