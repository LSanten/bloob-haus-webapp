/**
 * carousel renderer — pure function
 *
 * Input:  { items: [{ src, alt, caption }] } from parser.parse()
 *         settings: { fit?: "contain" | "cover", ratio?: "3/2" | "4/3" | "16/9" | "1/1" | ..., label?: string }
 *         context:  { media?: (string|null)[] } — per-slide image markup that the host
 *                   already has (the site's image optimizer output: <a class="pswp-gallery__item">
 *                   <picture>…</picture></a>). Injected, never read here. When an entry is
 *                   missing the renderer falls back to a plain <img>.
 * Output: complete HTML string. Every photo and caption is real markup, so the carousel
 *         reads as a swipeable row with no JavaScript; browser.js only adds behaviour.
 *
 * Pure: no DOM, no file system.
 */

const FITS = new Set(["contain", "cover"]);
const RATIO = /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/;

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fallbackImg(item) {
  return `<img src="${esc(item.src)}" alt="${esc(item.alt)}" loading="lazy" decoding="async">`;
}

/**
 * @param {{ items: { src: string, alt: string, caption: string }[] }} data
 * @param {{ fit?: string, ratio?: string, label?: string }} [settings]
 * @param {{ media?: (string|null)[] }} [context]
 * @returns {string}
 */
export function render({ items }, settings = {}, { media = [] } = {}) {
  if (!items || !items.length) return "";

  const fit = FITS.has(settings.fit) ? settings.fit : "contain";
  const ratio = RATIO.test(String(settings.ratio || "")) ? String(settings.ratio).replace(/\s+/g, "") : "";
  const label = settings.label || "Photos";
  const total = items.length;

  const style = ratio ? ` style="--carousel-ratio: ${esc(ratio)}"` : "";

  const slides = items
    .map((item, i) => {
      const mediaHtml = media[i] || fallbackImg(item);
      const caption = item.caption
        ? `\n      <figcaption class="carousel__caption">${esc(item.caption)}</figcaption>`
        : "";
      return `    <figure class="carousel__slide" data-index="${i}" aria-label="${i + 1} of ${total}">
      <div class="carousel__media">${mediaHtml}</div>${caption}
    </figure>`;
    })
    .join("\n");

  // Controls start hidden: they only work with script, so browser.js reveals them.
  const controls =
    total > 1
      ? `
  <div class="carousel__controls" hidden>
    <button type="button" class="carousel__btn carousel__btn--prev" aria-label="Previous photo">&#8249;</button>
    <span class="carousel__count" aria-live="polite">1 / ${total}</span>
    <button type="button" class="carousel__btn carousel__btn--next" aria-label="Next photo">&#8250;</button>
  </div>`
      : "";

  return `<section class="carousel carousel--fit-${fit}${total === 1 ? " carousel--single" : ""}" data-carousel aria-roledescription="carousel" aria-label="${esc(label)}"${style}>
  <div class="carousel__track" tabindex="0">
${slides}
  </div>${controls}
</section>`;
}
