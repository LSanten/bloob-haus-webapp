/**
 * Splits a built HTML page into the parts a shared-template change may touch (SEO tags in
 * <head>) and the part it must not (the body). Used by scripts/compare-builds.js to prove
 * that a change to themes/_base leaves other sites' pages identical.
 */

const HEAD_TAG = /<title>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*rel=["']canonical["'][^>]*>/gi;

/**
 * @param {string} html
 * @returns {{ headTags: string[], body: string }}
 */
export function splitHtml(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const headTags = (head.match(HEAD_TAG) || []).map((t) => t.replace(/\s+/g, " ")).sort();
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return { headTags, body: bodyMatch ? bodyMatch[1] : html };
}
