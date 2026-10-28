/**
 * The meta description a page gets when its author didn't write one.
 *
 * Order: the page's own `description` → its subtitle + first prose (the same excerpt post
 * cards use, scripts/utils/page-excerpt.js) → the site description. The result is written to
 * `seo_description`, read only by partials/seo-meta.njk — never into `description`, which some
 * themes render on the page (melt folder-index, warm-kitchen tags).
 * Pure: values in, string out.
 */
import { extractExcerpt } from "./page-excerpt.js";
import { stripInlineMarkdown } from "./title-deduplicator.js";

/** Google shows roughly this many characters of a description. */
export const SEO_DESCRIPTION_MAX = 155;

function truncateAtWord(text, max) {
  if (text.length <= max) return text;
  const room = text.slice(0, max - 1); // leave space for the ellipsis
  const cut = room.lastIndexOf(" ");
  return `${(cut > 0 ? room.slice(0, cut) : room).replace(/[\s,;:—–-]+$/, "")}…`;
}

/**
 * @param {{ description?: string, subtitle?: string, body?: string, siteDescription?: string, maxLength?: number }} input
 * @returns {string}
 */
export function buildSeoDescription({ description, subtitle, body, siteDescription = "", maxLength = SEO_DESCRIPTION_MAX } = {}) {
  const own = description == null ? "" : String(description).trim();
  if (own) return own;

  const sub = subtitle ? stripInlineMarkdown(String(subtitle)).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
  const prose = extractExcerpt(body || "");
  const joined = [sub, prose].filter(Boolean).join(" — ");
  if (!joined) return String(siteDescription || "").trim();
  return truncateAtWord(joined, maxLength);
}
