/**
 * srcset-encode.js — pure helpers.
 *
 * eleventy-img writes `srcset` candidates with the file name as-is, so a vault image
 * called "New heat pumps.jpg" produces `srcset="/media/optimized/New heat pumps-1200w.webp 1200w"`.
 * srcset separates URL and descriptor by whitespace, so the browser cannot parse that
 * candidate, drops every <source>, and falls back to the <img> src (the big PNG).
 * Encoding spaces in each candidate's URL fixes it without touching file names on disk.
 */

/** "a b.webp 600w, c d.webp 1200w" → "a%20b.webp 600w, c%20d.webp 1200w" */
export function encodeSrcset(srcset) {
  return String(srcset)
    .split(/,\s+(?=\S)/)
    .map((candidate) => {
      const m = candidate.trim().match(/^(.*?)(\s+\d+(?:\.\d+)?[wx])?$/);
      if (!m) return candidate;
      const url = m[1].replace(/ /g, "%20");
      return url + (m[2] || "");
    })
    .join(", ");
}

/** Encode every srcset / data-pswp-srcset attribute value in an HTML string. */
export function encodeSrcsetAttributes(html) {
  return String(html).replace(/\b((?:data-pswp-)?srcset)="([^"]*)"/g, (all, attr, value) => `${attr}="${encodeSrcset(value)}"`);
}
