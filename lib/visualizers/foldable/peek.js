/**
 * Fold peeks: small round previews of the cards inside a folded section.
 *
 * Leon's Jekyll site showed a row of overlapping circles under a folded heading,
 * one per marble preview inside it ("marble previews working with now
 * collapsible tabs", 2025-12-08), so a closed section still says what it holds.
 * There it was built in the browser. Here it is filled in at build time, from
 * the card images a collection (or folder-preview) has already rendered inside
 * the fold, into the empty placeholder fold-headings.js leaves in each summary.
 *
 * Decorative only: the placeholder is aria-hidden and the CSS hides it while the
 * fold is open. Nothing is lost when no peek is shown.
 *
 * PURE: string in, string out.
 */

import { FOLD_PEEK_PLACEHOLDER } from "./fold-headings.js";

/** At most this many circles per fold. Each one is a real image request. */
export const MAX_PEEKS = 6;

const TAG_RE = /<details\b[^>]*>|<\/details>/gi;

// A card's image wrap, as rendered by the collection shape (and by
// folder-preview's build-time path). Placeholder wraps (no real image) are
// skipped by requiring the class attribute to be exactly the plain wrap class.
const CARD_IMG_RE = /<div class="fp-card__image-wrap">\s*<img\b[^>]*?\bsrc="([^"]+)"/gi;

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Card image URLs inside an HTML fragment, de-duplicated, in order. */
export function collectCardImages(html, max = MAX_PEEKS) {
  const seen = new Set();
  const out = [];
  let m;
  CARD_IMG_RE.lastIndex = 0;
  while ((m = CARD_IMG_RE.exec(html)) !== null) {
    const src = m[1];
    if (seen.has(src)) continue;
    seen.add(src);
    out.push(src);
    if (out.length >= max) break;
  }
  return out;
}

export function renderPeekHtml(srcs) {
  if (!srcs.length) return "";
  const imgs = srcs
    .map((src) => `<img class="bloob-fold__peek-img no-pswp" src="${escAttr(src)}" alt="" loading="lazy" decoding="async">`)
    .join("");
  return `<span class="bloob-fold__peek" aria-hidden="true">${imgs}</span>`;
}

/**
 * Fill every fold's peek placeholder from the card images inside that fold
 * (nested folds included), and drop placeholders that stay empty.
 */
export function addFoldPeeks(html) {
  if (!html || !html.includes("bloob-fold__peek")) return html;

  const stack = [];
  const fills = []; // { at, html }
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    if (m[0][1] !== "/") {
      stack.push({ isFold: /class="bloob-fold"/.test(m[0]), openEnd: m.index + m[0].length });
      continue;
    }
    const open = stack.pop();
    if (!open || !open.isFold) continue;
    const at = html.indexOf(FOLD_PEEK_PLACEHOLDER, open.openEnd);
    if (at === -1 || at > m.index) continue;
    const body = html.slice(at + FOLD_PEEK_PLACEHOLDER.length, m.index);
    fills.push({ at, html: renderPeekHtml(collectCardImages(body)) });
  }

  if (!fills.length) return html;
  fills.sort((a, b) => b.at - a.at);
  let out = html;
  for (const f of fills) {
    out = out.slice(0, f.at) + f.html + out.slice(f.at + FOLD_PEEK_PLACEHOLDER.length);
  }
  return out;
}
