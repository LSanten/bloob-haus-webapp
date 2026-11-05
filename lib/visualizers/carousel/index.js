/**
 * Carousel Visualizer — build-time transform
 *
 * Reads data-vis-raw (base64 raw markdown) and data-vis-settings from the rendered
 * <section class="carousel">, parses slides + captions with parser.js and renders the
 * final markup with renderer.js.
 *
 * Images stay "normal images": the optimizeImages transform runs BEFORE visualizer
 * transforms, so by now the section's rendered inner HTML already holds each photo as
 * resized webp/png <picture> markup wrapped for PhotoSwipe. We lift that markup out in
 * order and inject it into the renderer, instead of emitting raw <img> tags that would
 * ship the multi-megabyte originals. If the counts don't line up (unexpected markup),
 * every slide falls back to a plain <img>. Same idea as image-text's stripFirstImage.
 *
 * Activation:
 *   ::: carousel
 *   ![[photo-1.jpg]]
 *   Caption for photo 1.
 *
 *   ![[photo-2.jpg]]
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "carousel";

// One optimized image (PhotoSwipe anchor around a <picture>), a bare <picture>, or a bare <img>.
const MEDIA = /<a\s[^>]*class="[^"]*pswp-gallery__item[^"]*"[^>]*>[\s\S]*?<\/a>|<picture[\s\S]*?<\/picture>|<img\s[^>]*>/gi;

export function extractMedia(innerHtml) {
  return String(innerHtml || "").match(MEDIA) || [];
}

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

function parseSettings(attrs) {
  const match = attrs.match(/data-vis-settings='([^']*)'/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

export function transform(html) {
  const sectionPattern = /<section class="carousel"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs, innerHtml) => {
    const raw = extractVisRaw(attrs);
    if (!raw) {
      console.warn("[carousel] No data-vis-raw found — skipping transform.");
      return match;
    }

    const parsed = parse(raw);
    if (!parsed.items.length) {
      console.warn("[carousel] No images parsed — skipping transform.");
      return match;
    }

    const found = extractMedia(innerHtml);
    const media = found.length === parsed.items.length ? found : [];
    if (found.length && !media.length) {
      console.warn(`[carousel] Found ${found.length} images in rendered HTML but parsed ${parsed.items.length} — using plain <img> tags.`);
    }

    return render(parsed, parseSettings(attrs), { media });
  });
}
