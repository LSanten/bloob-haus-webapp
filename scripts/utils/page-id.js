/**
 * Canonical Bloob Haus page ID.
 *
 * ID = lowercased `host + path`, no scheme, no trailing slash. Derived purely from the
 * site's base URL and the page's URL path, so it is unique across the whole bloob.haus
 * domain (one FastComments account is shared across all subdomains). Lowercasing is
 * ID-only — it never changes the visible URL (preserve-case sites keep their casing).
 *
 * Examples:
 *   derivePageId("https://leons.bloob.haus", "/marbles/My-Note/") -> "leons.bloob.haus/marbles/my-note"
 *   derivePageId("https://melt.bloob.haus",  "/about-melt/")      -> "melt.bloob.haus/about-melt"
 *   derivePageId("https://buffbaby.bloob.haus", "/")              -> "buffbaby.bloob.haus"
 *
 * See docs/architecture/urls-and-ids.md for the full contract.
 *
 * @param {string} siteUrl - Site base URL (e.g. "https://leons.bloob.haus")
 * @param {string} pageUrl - Page URL path (e.g. "/marbles/my-note/")
 * @returns {string} Canonical page ID
 */
export function derivePageId(siteUrl, pageUrl) {
  let host;
  try {
    host = new URL(siteUrl).host;
  } catch {
    // Fallback for a bare host or malformed base — strip scheme and any path.
    host = String(siteUrl || "").replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
  }
  const path = String(pageUrl || "");
  return (host + path).toLowerCase().replace(/\/+$/, "");
}
