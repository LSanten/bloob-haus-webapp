/**
 * Slugify a string: lowercase, spaces/special chars → hyphens
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

export default {
  permalink: (data) => {
    // If the page has an explicit permalink in frontmatter, use it
    if (data.permalink && data.permalink !== true) return data.permalink;

    // Only modify permalinks for pages with a fileSlug (content pages)
    if (!data.page.fileSlug) return data.permalink;

    const shouldSlugify = data.site?.permalinks?.slugify ?? false;
    const pathParts = data.page.filePathStem.split("/").filter(Boolean);
    const section = pathParts.slice(0, -1).join("/");
    const filename = pathParts[pathParts.length - 1];
    const slug = shouldSlugify ? slugify(filename) : filename;

    if (section) {
      return `/${section}/${slug}/`;
    }
    return `/${slug}/`;
  },
};
