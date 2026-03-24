/**
 * services renderer — pure function
 *
 * Input:  { heading, description, items } from parser.parse()
 *         + settings object { id }
 * Output: HTML string matching the .services layout from theme.min.css
 *         (white background, two-column title+description left / list right,
 *          list items have CSS arrow icons via li::before)
 *
 * Pure — no DOM, no file system, no side effects.
 */

/**
 * @param {{ heading: string, description: string, items: string[] }} data
 * @param {{ id?: string }} settings
 * @returns {string} HTML string
 */
export function render(data, settings = {}) {
  const { heading, description, items } = data;
  const id = settings.id || "services";

  const listItems = items
    .map((item) => `                <li><h3>${item}</h3></li>`)
    .join("\n");

  return `<section class="services" id="${id}">
    <div class="services__wrapper maxwidth">
        <div class="services__title-text">
            <h1 class="h1-medium services__title">${heading}</h1>
            <p class="services__text">${description}</p>
        </div>
        <div class="services__list">
            <ul>
${listItems}
            </ul>
        </div>
    </div>
</section>`;
}
