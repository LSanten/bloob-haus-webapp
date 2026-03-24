/**
 * heading-and-paragraph renderer — pure function
 *
 * Input:  { heading, paragraph } from parser.parse()
 *         + settings object { id }
 * Output: HTML string matching the .heading-and-paragraph layout from theme.min.css
 *         (green background #b6fad1, two-column heading + paragraph on desktop)
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * @param {{ heading: string, paragraph: string }} data
 * @param {{ id?: string }} settings
 * @returns {string} HTML string
 */
export function render(data, settings = {}) {
  const { heading, paragraph } = data;
  const id = settings.id || "about-us";

  return `<section class="heading-and-paragraph" id="${id}">
    <div class="heading-and-paragraph__wrapper maxwidth">
        <h1 class="h1-medium heading-and-paragraph__heading">${heading}</h1>
        <p class="heading-and-paragraph__paragraph">${paragraph}</p>
    </div>
</section>`;
}
