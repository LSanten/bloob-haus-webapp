/**
 * musings renderer — pure function
 *
 * Input:  { items: [{quote, name, date, color}], limit } from parser.parse()
 * Output: HTML string with dual layout:
 *           - .musings__container-mobile  (simple card stack)
 *           - .musings__container-desktop (vertical Swiper carousel, #musings-swiper)
 *
 * Cards beyond `limit` get classes "hidden no-active" so theme.min.js can
 * toggle them via .musings__more-button click handler.
 * Desktop Swiper is initialized by theme.min.js — no browser.js needed.
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * Render a single card's inner content (shared between mobile and desktop).
 */
function cardContent({ quote, name, date }) {
  return `
                <p class="musings__content-text">" ${quote} "</p>
                <div class="musings__content-bottom">
                    <p class="musings__name">${name}</p>
                    <p class="musings__date">${date}</p>
                </div>`;
}

/**
 * @param {{ items: {quote: string, name: string, date: string, color: string}[], limit: number|null, infiniteScroll: boolean }} parsed
 * @returns {string} HTML string
 */
export function render({ items, limit, infiniteScroll = true }) {
  if (!items.length) return "";

  const showMore = limit !== null && items.length > limit;

  // Mobile: simple stack; extras get hidden no-active classes
  const mobileCards = items
    .map((item, i) => {
      const isHidden = limit !== null && i >= limit;
      const hiddenClass = isHidden ? " hidden no-active" : "";
      return `            <div class="musings__content ${item.color}${hiddenClass}">${cardContent(item)}
            </div>`;
    })
    .join("\n");

  const moreButton = showMore
    ? `        <div class="musings__more-button">
            <a class="button-1">MORE MUSINGS </a>
        </div>`
    : "";

  // Desktop: Swiper carousel (default) or static stack (infinite_scroll: false)
  let desktopContainer;
  if (infiniteScroll) {
    const desktopSlides = items
      .map(
        (item) =>
          `            <div class="swiper-slide musings__content ${item.color}">${cardContent(item)}
            </div>`,
      )
      .join("\n");
    desktopContainer = `        <div class="swiper musings__container-desktop" id="musings-swiper">
            <div class="swiper-wrapper musings__container-wrapper-desktop">
${desktopSlides}
            </div>
        </div>`;
  } else {
    // No Swiper — render as a plain scrollable stack; theme.min.js won't init it
    const desktopCards = items
      .map((item, i) => {
        const isHidden = limit !== null && i >= limit;
        const hiddenClass = isHidden ? " hidden no-active" : "";
        return `            <div class="musings__content ${item.color}${hiddenClass}">${cardContent(item)}
            </div>`;
      })
      .join("\n");
    desktopContainer = `        <div class="musings__container-desktop musings__container-desktop--static">
            <div class="musings__container-wrapper-desktop">
${desktopCards}
            </div>
        </div>`;
  }

  return `<section class="musings" id="musings">
    <div class="musings__wrapper maxwidth">
        <p class="label musings__title">MUSINGS</p>
        <div class="musings__container-mobile">
            <div class="musings__container-wrapper-mobile">
${mobileCards}
            </div>
        </div>
${desktopContainer}
${moreButton}
    </div>
</section>`;
}
