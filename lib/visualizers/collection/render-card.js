/**
 * Collection card renderer — pure HTML string output.
 *
 * Shared between build-time (index.js, Node.js) and runtime (browser.js,
 * bundled by esbuild). No DOM manipulation, no I/O — returns strings only.
 *
 * Card image always carries class="no-pswp" so the image-optimizer transform
 * emits a plain <picture> instead of a PhotoSwipe <a> wrapper, which would
 * create an invalid nested anchor inside the card's <a href>.
 *
 * Canonical class: fp-card__image-wrap (not fp-card__img-wrap — legacy name
 * in folder-preview/browser.js that the collection shape does not perpetuate).
 */

const FIELD_LABELS = {
  building_type:     "Type",
  construction_type: "Construction",
  location:          "Location",
  sqft:              "sqft",
  services:          "Services",
  target:            "Target",
  owner:             "Owner",
  architect:         "Architect",
};

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

export function parseShowFields(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((f) => String(f).trim()).filter(Boolean);
  return String(raw).split(",").map((f) => f.trim()).filter(Boolean);
}

/**
 * Render a single card as an HTML string.
 */
export function renderCardHtml(node, { showFields = [] } = {}) {
  const href = escAttr(node.redirect || node.id);
  const external = node.redirect ? ' target="_blank" rel="noopener"' : "";

  const imageHtml = node.image
    ? `<div class="fp-card__image-wrap"><img class="no-pswp" src="${escAttr(node.image)}" alt="${escAttr(node.title || "")}" loading="lazy"></div>`
    : `<div class="fp-card__image-wrap fp-card__image-wrap--placeholder"></div>`;

  const subtitleHtml = node.subtitle
    ? `<p class="fp-card__subtitle">${esc(node.subtitle)}</p>`
    : "";

  const fieldsHtml =
    showFields.length > 0
      ? `<div class="fp-card__fields">${showFields
          .filter((f) => node[f] !== undefined && node[f] !== null)
          .map((f) => {
            const label = FIELD_LABELS[f] || capitalize(f);
            const val = Array.isArray(node[f]) ? node[f].join(", ") : String(node[f]);
            return `<span class="fp-field"><span class="fp-field__label">${esc(label)}</span><span class="fp-field__value">${esc(val)}</span></span>`;
          })
          .join("")}</div>`
      : "";

  return `<a class="fp-card" href="${href}"${external}>
  ${imageHtml}
  <div class="fp-card__body">
    <span class="fp-card__title">${esc(node.title || node.id)}</span>
    ${subtitleHtml}
    ${fieldsHtml}
  </div>
</a>`;
}

/**
 * Render an array of nodes as a card grid HTML string.
 */
export function renderCardGridHtml(pages, { showFields = [], emptyLabel = "No pages yet." } = {}) {
  if (!pages.length) return `<p class="collection__empty">${esc(emptyLabel)}</p>`;
  return `<div class="fp-cards">\n${pages.map((n) => renderCardHtml(n, { showFields })).join("\n")}\n</div>`;
}
