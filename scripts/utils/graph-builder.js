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
 * Builds a graph data structure from per-page link data.
 *
 * @param {Object} perPageLinks - Map of page URL → { title, outgoing: [url, ...] }
 *   where outgoing URLs may include heading anchors and are already resolved
 *   to internal absolute paths.
 * @returns {{ nodes: Array, links: Array }} Graph data for force-graph / D3
 *
 * Output format:
 *   nodes: [{ id, title, section }]
 *   links: [{ source, target }]  — source/target are node IDs (URLs)
 */
export function buildGraph(perPageLinks) {
  // Build the set of known page URLs (for filtering outgoing links)
  const knownUrls = new Set(Object.keys(perPageLinks));

  // Build nodes array
  const nodes = Object.entries(perPageLinks).map(([url, page]) => ({
    id: url,
    title: page.title,
    section: sectionFromUrl(url),
  }));

  // Build links array — deduplicated, only between known nodes, no self-links
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

  return { nodes, links };
}
