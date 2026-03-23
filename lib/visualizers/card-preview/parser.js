/**
 * card-preview parser — pure function
 *
 * Input:  raw markdown content of a ::: card-preview block.
 *         At this point links are already resolved by preprocess-content.js,
 *         so [[wiki-links]] appear as standard markdown links:
 *           [UC Berkeley Hildebrand Hall](/projects/uc-berkeley-hildebrand-hall-hvac-modernization/)
 *
 * Output: array of { title, url } objects in the order they appear.
 *
 * Pure — no DOM, no file system, no side effects.
 */

export function parse(raw) {
  const links = [];
  const pattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = pattern.exec(raw)) !== null) {
    const title = m[1].trim();
    const url = m[2].trim();
    // Only internal absolute links (skip anchors, external URLs)
    if (url.startsWith("/")) {
      links.push({ title, url });
    }
  }
  return links;
}
