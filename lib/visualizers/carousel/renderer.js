/**
 * carousel renderer — pure function
 *
 * Input:  { items: [{ src, alt, caption, size? }] } from parser.parse()
 *         settings: { ratio?, height?, fit?, label?, loop? }
 *         context:  { media?: (string|null)[] } — per-slide image markup that the host
 *                   already has (the site's image optimizer output: <a class="pswp-gallery__item">
 *                   <picture>…<img width height></picture></a>). Injected, never read here.
 *                   When an entry is missing the renderer falls back to a plain <img>.
 * Output: complete HTML string. Every photo and caption is real markup, so the carousel
 *         reads as a swipeable row with no JavaScript; browser.js only adds behaviour.
 *
 * Two layouts:
 *   - natural (default): every photo the same HEIGHT, each keeping its own shape (a portrait
 *     photo is a narrow slide, a panorama a wide one). Nothing is cropped or letterboxed, and
 *     the carousel never changes height while you slide.
 *   - framed (ratio= given): every photo sits in the same frame shape, fitted inside it.
 *
 * Size, Obsidian-style, from the FIRST image: "|611" shows that photo 611px wide (its height
 * follows from its own shape, read from the optimizer's width/height attributes) and that
 * height becomes the carousel's height; "|611x400" means 611 wide, 400 tall. Without a size:
 * height= on the opener, else 420px. Widths never exceed 90% of the carousel.
 *
 * Pure: no DOM, no file system.
 */

const FITS = new Set(["contain", "cover"]);
const RATIO = /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/;
const DEFAULT_HEIGHT = 420;
const LOOP_ON = new Set(["true", "yes", "1", "infinite", "on"]);
const LOOP_CLONES = 2; // copies of the last / first photos placed before / after, so both sides can peek

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

/** width/height of the first <img> in a markup string → aspect (w/h), or null. */
export function aspectOf(html) {
  const img = String(html || "").match(/<img\s[^>]*>/i);
  if (!img) return null;
  const w = img[0].match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const h = img[0].match(/\bheight="(\d+(?:\.\d+)?)"/);
  return w && h && Number(h[1]) > 0 ? Number(w[1]) / Number(h[1]) : null;
}

const round = (n) => Math.round(n * 100) / 100;

function slideHtml(item, i, total, mediaHtml, clone, aspect) {
  const caption = item.caption
    ? `
      <figcaption class="carousel__caption">${esc(item.caption)}</figcaption>`
    : "";
  // An Obsidian size ("|611") arrives as the image's alt text; it is not a description.
  let media = item.size ? mediaHtml.replace(/\balt="\d+(?:x\d+)?"/g, 'alt=""') : mediaHtml;
  // Loop copies: hidden from screen readers and the tab order (not `inert`: a click on a
  // peeking copy must still reach browser.js to centre it), and their links lose the
  // lightbox class so the lightbox gallery does not list the same photo twice.
  if (clone) {
    media = media.replace(/\bpswp-gallery__item\b/g, "carousel__clone-link").replace(/<a /g, '<a tabindex="-1" ');
  }
  const attrs = clone
    ? ` data-index="${i}" data-clone aria-hidden="true"`
    : ` data-index="${i}" aria-label="${i + 1} of ${total}"`;
  const style = aspect ? ` style="--slide-aspect: ${round(aspect)}"` : "";
  return `    <figure class="carousel__slide"${attrs}${style}>
      <div class="carousel__media">${media}</div>${caption}
    </figure>`;
}

/**
 * @param {{ items: { src: string, alt: string, caption: string, size?: { width: number, height?: number } }[] }} data
 * @param {{ fit?: string, ratio?: string, height?: string, label?: string, loop?: string }} [settings]
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
  const mediaFor = (i) => media[i] || fallbackImg(items[i]);
  const aspects = items.map((_, i) => aspectOf(mediaFor(i)));
  const natural = !ratio;

  const vars = [];
  const first = items[0].size;
  if (natural) {
    // Height for the whole carousel (px)
    let height = Number(settings.height) > 0 ? Number(settings.height) : DEFAULT_HEIGHT;
    if (first && first.height) height = first.height;
    else if (first && first.width && aspects[0]) height = first.width / aspects[0];
    vars.push(`--carousel-height: ${Math.round(height)}px`);
  } else {
    vars.push(`--carousel-ratio: ${esc(ratio)}`);
    if (first && first.width) vars.push(`--carousel-slide: min(${first.width}px, 90cqi)`);
  }

  const order = items.map((_, i) => ({ i, clone: false }));
  if (loop) {
    const n = Math.min(LOOP_CLONES, total);
    order.unshift(...items.slice(-n).map((_, k) => ({ i: total - n + k, clone: true })));
    order.push(...items.slice(0, n).map((_, k) => ({ i: k, clone: true })));
  }
  const slides = order.map(({ i, clone }) => slideHtml(items[i], i, total, mediaFor(i), clone, natural ? aspects[i] : null));

  if (natural) {
    // Side padding that lets the first and last slide sit in the centre: half the track
    // minus half that slide's width (all photos the same height, each its own width).
    const edge = (i) => (aspects[i] ? `calc(50cqi - min(var(--carousel-height) * ${round(aspects[i])}, 90cqi) / 2)` : "25cqi");
    vars.push(`--carousel-pad-start: ${edge(order[0].i)}`, `--carousel-pad-end: ${edge(order[order.length - 1].i)}`);
  }
  const style = ` style="${vars.join("; ")}"`;

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

  const classes = [
    "carousel",
    natural ? "carousel--natural" : "carousel--framed",
    `carousel--fit-${fit}`,
    total === 1 ? "carousel--single" : "",
    loop ? "carousel--loop" : "",
  ].filter(Boolean).join(" ");
  return `<section class="${classes}" data-carousel${loop ? " data-loop" : ""} aria-roledescription="carousel" aria-label="${esc(label)}"${style}>
  <div class="carousel__track" tabindex="0">
${slides.join("\n")}
  </div>${controls}
</section>`;
}
