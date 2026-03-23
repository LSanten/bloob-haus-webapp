/**
 * card-preview renderer — pure function
 *
 * Input:  array of enriched { title, url, image } from index.js
 *         settings: { limit, show_more }
 *
 * Output: HTML string matching .projects layout from theme.min.css
 *
 * Cards beyond `limit` get classes "no-visible hidden" so theme.min.js
 * can toggle them via the .projects__more-projects button click handler.
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * @param {{ title: string, url: string, image?: string }[]} items
 * @param {{ limit?: number, show_more?: boolean }} settings
 * @returns {string} HTML string
 */
export function render(items, settings = {}) {
  const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
  const showMore = settings.show_more === true || settings.show_more === "true";

  const cards = items
    .map((item, i) => {
      const isHidden = isFinite(limit) && i >= limit;
      const hiddenClass = isHidden ? " no-visible hidden" : "";

      const imageHtml = item.image
        ? `<div class="projects__image">
                        <img src="${item.image}" alt="${item.title}">
                    </div>`
        : "";

      return `            <a class="projects__container${hiddenClass}" href="${item.url}">
                <div class="projects__inner-container">
                    ${imageHtml}
                    <div class="projects__content">
                        <h2 class="projects__title">${item.title}</h2>
                        <div class="projects__read-more button-1">VIEW PROJECT</div>
                    </div>
                </div>
            </a>`;
    })
    .join("\n");

  const moreButton =
    showMore && isFinite(limit) && items.length > limit
      ? `        <div class="projects__more-projects">
            <a class="button-1">MORE PROJECTS </a>
        </div>`
      : "";

  return `<section class="projects" id="projects">
    <div class="projects__wrapper maxwidth">
        <div class="projects__top-content">
${cards}
        </div>
${moreButton}
    </div>
</section>`;
}
