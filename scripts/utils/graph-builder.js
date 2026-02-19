/**
 * Graph Builder
 * Builds a nodes + links graph data structure from per-page link data.
 * Output is compatible with force-graph / D3 force simulation.
 */

/**
 * Derives the section name from a page URL.
 * "/recipes/chai/" → "recipes"
 * "/notes/spices/" → "notes"
 * "/about/" → "" (root-level page)
 *
 * @param {string} url - Page URL
 * @returns {string} Section name
 */
export function sectionFromUrl(url) {
  const parts = url.replace(/^\/|\/$/g, "").split("/");
  return parts.length > 1 ? parts[0] : "";
}

/**
 * Strips heading anchors from a URL so links point to the page, not a heading.
 * "/recipes/chai/#instructions" → "/recipes/chai/"
 *
 * @param {string} url - URL possibly containing a heading anchor
 * @returns {string} URL without anchor
 */
export function stripAnchor(url) {
  return url.split("#")[0];
}

/**
 * Builds a graph data structure from per-page link data, optionally including
 * tag nodes derived from a tag index.
 *
 * @param {Object} perPageLinks - Map of page URL → { title, outgoing: [url, ...] }
 *   where outgoing URLs may include heading anchors and are already resolved
 *   to internal absolute paths.
 * @param {Object} [tagIndex] - Optional map of tag slug → { count, pages: [{title, url}] }
 *   from tag-extractor. When provided, tags are added as nodes connected to their pages.
 * @returns {{ nodes: Array, links: Array }} Graph data for force-graph / D3
 *
 * Output format:
 *   nodes: [{ id, title, section, type }]
 *     type: "page" for normal pages, "tag" for tag nodes
 *   links: [{ source, target }]  — source/target are node IDs (URLs)
 */
export function buildGraph(perPageLinks, tagIndex = {}) {
  // Build the set of known page URLs (for filtering outgoing links)
  const knownUrls = new Set(Object.keys(perPageLinks));

  // Build page nodes array
  const nodes = Object.entries(perPageLinks).map(([url, page]) => ({
    id: url,
    title: page.title,
    section: sectionFromUrl(url),
    type: "page",
  }));

  // Build page→page links — deduplicated, only between known nodes, no self-links
  const seen = new Set();
  const links = [];

  for (const [sourceUrl, page] of Object.entries(perPageLinks)) {
    for (const rawTargetUrl of page.outgoing) {
      const targetUrl = stripAnchor(rawTargetUrl);

      // Skip self-links and links to unknown pages
      if (targetUrl === sourceUrl || !knownUrls.has(targetUrl)) continue;

      const key = `${sourceUrl}→${targetUrl}`;
      if (seen.has(key)) continue;

      seen.add(key);
      links.push({ source: sourceUrl, target: targetUrl });
    }
  }

  // Add tag nodes and page→tag links from tagIndex
  if (tagIndex && Object.keys(tagIndex).length > 0) {
    // Track which page URLs have tags (for co-occurrence links)
    const tagPageMap = new Map(); // tagId → Set<pageUrl>

    for (const [slug, tagData] of Object.entries(tagIndex)) {
      const tagId = `/tags/${slug}/`;
      const degree = tagData.pages ? tagData.pages.length : (tagData.count || 0);

      // Tag node — sized by how many pages use it
      nodes.push({
        id: tagId,
        title: `#${slug}`,
        section: "tags",
        type: "tag",
        nodeVal: 1 + Math.log(degree + 1) * 2,
      });

      const pageSet = new Set();
      tagPageMap.set(tagId, pageSet);

      // Page→tag links (only for pages that exist in the graph)
      if (tagData.pages) {
        for (const pageRef of tagData.pages) {
          const pageUrl = pageRef.url;
          if (knownUrls.has(pageUrl)) {
            const key = `${pageUrl}→${tagId}`;
            if (!seen.has(key)) {
              seen.add(key);
              links.push({ source: pageUrl, target: tagId });
              pageSet.add(pageUrl);
            }
          }
        }
      }
    }

    // Tag co-occurrence links: connect tags that share ≥2 pages
    const tagIds = Array.from(tagPageMap.keys());
    for (let i = 0; i < tagIds.length - 1; i++) {
      for (let j = i + 1; j < tagIds.length; j++) {
        const aPages = tagPageMap.get(tagIds[i]);
        const bPages = tagPageMap.get(tagIds[j]);
        // Count shared pages
        let shared = 0;
        for (const p of aPages) {
          if (bPages.has(p)) shared++;
          if (shared >= 2) break;
        }
        if (shared >= 2) {
          const key = `${tagIds[i]}→${tagIds[j]}`;
          if (!seen.has(key)) {
            seen.add(key);
            links.push({ source: tagIds[i], target: tagIds[j] });
          }
        }
      }
    }
  }

  return { nodes, links };
}
