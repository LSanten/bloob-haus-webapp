/**
 * Collection resolver — pure source resolution.
 *
 * PURE. Takes the graph nodes as an *argument*; never reads them itself. The
 * impure fetch differs per host (readFileSync in Node, fetch() in the browser,
 * handed in directly by the playground) and lives in the host, not here.
 *
 * This is the `resolve.js` seam of the pure-renderer standard — the one place
 * a shape declares how it obtains data that lives *outside* its own block.
 * Same pattern as lib/visualizers/scene-nav/resolve.js.
 *
 * See docs/architecture/visualizers.md → "The pure-renderer standard".
 */

/**
 * Parse a source string into a typed source object.
 * Phase 1 supports: folder=X | tag=X | field:KEY=VAL | all
 */
export function parseSource(source) {
  if (!source || source === "all") return { type: "all" };

  const s = String(source).trim();
  if (s.startsWith("folder=")) return { type: "folder", value: s.slice(7).trim() };
  if (s.startsWith("tag="))    return { type: "tag",    value: s.slice(4).trim() };
  if (s.startsWith("field:")) {
    const rest = s.slice(6);
    const eqIdx = rest.indexOf("=");
    if (eqIdx === -1) return { type: "all" };
    return { type: "field", key: rest.slice(0, eqIdx).trim(), value: rest.slice(eqIdx + 1).trim() };
  }
  return { type: "all" };
}

/**
 * Filter graph.json nodes by a parsed (or raw string) source.
 * Always excludes archived pages and folder-index stubs.
 */
export function filterNodes(nodes, source) {
  const s = typeof source === "string" ? parseSource(source) : source;

  if (s.type === "folder") {
    const folderIndexId = "/" + s.value + "/";
    return nodes.filter(
      (n) =>
        n.section === s.value &&
        n.type === "page" &&
        n.id !== folderIndexId &&
        !n.id.endsWith("/index/") &&
        n.website_status !== "archived"
    );
  }

  if (s.type === "tag") {
    const tagLower = s.value.toLowerCase();
    return nodes.filter(
      (n) =>
        n.type === "page" &&
        Array.isArray(n.tags) &&
        n.tags.map((t) => String(t).toLowerCase()).includes(tagLower) &&
        n.website_status !== "archived"
    );
  }

  if (s.type === "field") {
    return nodes.filter((n) => {
      const fieldVal = n[s.key];
      const matches = Array.isArray(fieldVal)
        ? fieldVal.some((v) => String(v) === s.value)
        : String(fieldVal ?? "") === s.value;
      return n.type === "page" && matches && n.website_status !== "archived";
    });
  }

  // all
  return nodes.filter((n) => n.type === "page" && n.website_status !== "archived");
}

/**
 * Sort and optionally limit an array of nodes.
 */
export function sortAndLimit(pages, { sort = "alpha", limit } = {}) {
  const sorted = [...pages];
  if (sort === "reverse-alpha") {
    sorted.sort((a, b) =>
      (b.title || "").toLowerCase().localeCompare((a.title || "").toLowerCase())
    );
  } else {
    sorted.sort((a, b) =>
      (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase())
    );
  }
  const n = limit ? parseInt(limit, 10) : Infinity;
  return isFinite(n) ? sorted.slice(0, n) : sorted;
}

/**
 * Convenience: filter by source, then sort + limit.
 */
export function resolvePages(nodes, settings) {
  const filtered = filterNodes(nodes, settings.source || "all");
  return sortAndLimit(filtered, { sort: settings.sort, limit: settings.limit });
}
