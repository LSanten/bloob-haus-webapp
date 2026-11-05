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

const LOOP_ON = new Set(["true", "yes", "1", "infinite", "on"]);
const LOOP_CLONES = 2; // copies of the last / first photos placed before / after, so both sides can peek

function slideHtml(item, i, total, mediaHtml, clone) {
  const caption = item.caption
    ? `
      <figcaption class="carousel__caption">${esc(item.caption)}</figcaption>`
    : "";
  // Loop copies: hidden from screen readers and the tab order (not `inert`: a click on a
  // peeking copy must still reach browser.js to centre it), and their links lose the
  // lightbox class so the lightbox gallery does not list the same photo twice.
  const media = clone
    ? mediaHtml.replace(/\bpswp-gallery__item\b/g, "carousel__clone-link").replace(/<a /g, '<a tabindex="-1" ')
    : mediaHtml;
  const attrs = clone
    ? ` data-index="${i}" data-clone aria-hidden="true"`
    : ` data-index="${i}" aria-label="${i + 1} of ${total}"`;
  return `    <figure class="carousel__slide"${attrs}>
      <div class="carousel__media">${media}</div>${caption}
    </figure>`;
}

/**
 * @param {{ items: { src: string, alt: string, caption: string }[] }} data
 * @param {{ fit?: string, ratio?: string, label?: string, loop?: string }} [settings]
 * @param {{ media?: (string|null)[] }} [context]
 * @returns {string}
 */
export function render({ items }, settings = {}, { media = [] } = {}) {
  if (!items || !items.length) return "";

  const fit = FITS.has(settings.fit) ? settings.fit : "contain";
  const ratio = RATIO.test(String(settings.ratio || "")) ? String(settings.ratio).replace(/\s+/g, "") : "";
  const label = settings.label || "Photos";
  const total = items.length;
  // loop=true: endless in both directions. Needs 3+ photos to make sense.
  const loop = total > 2 && LOOP_ON.has(String(settings.loop || "").toLowerCase());

  // Size from the first photo, Obsidian-style: "|611" → every photo is shown 611px wide
  // (never wider than the carousel allows); "|611x400" also sets the frame shape, unless
  // ratio= is given. Height always follows from the width and the ratio.
  const firstSize = items[0].size;
  const sizeRatio = firstSize && firstSize.height ? `${firstSize.width}/${firstSize.height}` : "";
  const vars = [];
  if (ratio || sizeRatio) vars.push(`--carousel-ratio: ${esc(ratio || sizeRatio)}`);
  if (firstSize && firstSize.width) vars.push(`--carousel-slide: min(${firstSize.width}px, 90cqi)`);
  const style = vars.length ? ` style="${vars.join("; ")}"` : "";
  const mediaFor = (i) => media[i] || fallbackImg(items[i]);

  const real = items.map((item, i) => slideHtml(item, i, total, mediaFor(i), false));
  let slides = real;
  if (loop) {
    const n = Math.min(LOOP_CLONES, total);
    const before = items.slice(-n).map((item, k) => slideHtml(item, total - n + k, total, mediaFor(total - n + k), true));
    const after = items.slice(0, n).map((item, k) => slideHtml(item, k, total, mediaFor(k), true));
    slides = [...before, ...real, ...after];
  }

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

  const classes = `carousel carousel--fit-${fit}${total === 1 ? " carousel--single" : ""}${loop ? " carousel--loop" : ""}`;
  return `<section class="${classes}" data-carousel${loop ? " data-loop" : ""} aria-roledescription="carousel" aria-label="${esc(label)}"${style}>
  <div class="carousel__track" tabindex="0">
${slides.join("\n")}
  </div>${controls}
</section>`;
}
