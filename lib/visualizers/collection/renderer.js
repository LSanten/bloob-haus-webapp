/**
 * Collection renderer — pure HTML string output for every display mode.
 *
 * PURE. No DOM, no I/O, no globals. Runs identically in three hosts:
 *   - Node at build time (index.js)          — data from graph.json on disk
 *   - the browser as a fallback (browser.js) — data from fetch("/graph.json")
 *   - the future standalone playground       — data handed in directly
 *
 * This is the file that decouples indexability from the visualization: every
 * display mode emits real crawlable markup, so SEO is no longer a property of
 * *which* visual you picked. browser.js adds behavior (drag physics, Swiper)
 * to elements that already exist — it never builds markup.
 *
 * See docs/architecture/visualizers.md → "The pure-renderer standard".
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

/**
 * Deterministic size cycles. Index-based (not random) precisely so the
 * build-time and runtime renders agree byte-for-byte.
 */
const BUBBLE_SIZES = [140, 120, 155, 125, 140, 115, 150, 130];
const MARBLE_SIZES = [150, 130, 160, 125, 145, 135, 155, 128];

const EMPTY_LABEL = "Nothing here yet.";

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

function emptyHtml(label = EMPTY_LABEL) {
  return `<p class="collection__empty">${esc(label)}</p>`;
}

/** href + external-link attributes for a node (redirect wins over id). */
function linkAttrs(node) {
  return {
    href: escAttr(node.redirect || node.id),
    external: node.redirect ? ' target="_blank" rel="noopener"' : "",
  };
}

/**
 * Tags are not visible in the marble/bubble/list markup, so without this the
 * client-side filter can only match a page's title. Cards already carried it;
 * the other modes gained a search input in S67 and needed it too.
 */
function tagsAttr(node) {
  return Array.isArray(node.tags) && node.tags.length > 0
    ? ` data-fp-tags="${escAttr(node.tags.join(" "))}"`
    : "";
}

export function parseShowFields(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((f) => String(f).trim()).filter(Boolean);
  return String(raw).split(",").map((f) => f.trim()).filter(Boolean);
}

export function isSearchDisabled(settings = {}) {
  return settings.search === "off" || settings.search === false;
}

// ── cards ────────────────────────────────────────────────────────────────────

/**
 * Render a single card as an HTML string.
 */
export function renderCardHtml(node, { showFields = [] } = {}) {
  const { href, external } = linkAttrs(node);

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

  return `<a class="fp-card" href="${href}"${external}${tagsAttr(node)}>
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
  if (!pages.length) return emptyHtml(emptyLabel);
  return `<div class="fp-cards">\n${pages.map((n) => renderCardHtml(n, { showFields })).join("\n")}\n</div>`;
}

// ── list ─────────────────────────────────────────────────────────────────────

export function renderListHtml(pages) {
  if (!pages.length) return emptyHtml();

  const items = pages
    .map((node) => {
      const { href, external } = linkAttrs(node);
      const icon = node.bloobIcon
        ? `<img src="${escAttr(node.bloobIcon)}" class="folder-preview__icon" alt="" aria-hidden="true">`
        : "";
      return `<li class="folder-preview__item"${tagsAttr(node)}><a href="${href}" class="folder-preview__link"${external}>${icon}<span>${esc(node.title || node.id)}</span></a></li>`;
    })
    .join("\n");

  return `<ul class="folder-preview__list">\n${items}\n</ul>`;
}

// ── bubbles ──────────────────────────────────────────────────────────────────

export function renderBubblesHtml(pages) {
  if (!pages.length) return emptyHtml();

  const items = pages
    .map((node, i) => {
      const size = BUBBLE_SIZES[i % BUBBLE_SIZES.length];
      // Stagger: odd-indexed bubbles shift down
      const marginTop = i % 2 === 1 ? "margin-top:40px;" : "";
      const typeHtml = node.content_type
        ? `<span class="fp-bubble__type">${esc(node.content_type)}</span>`
        : "";
      return `<a href="${escAttr(node.id)}" class="fp-bubble"${tagsAttr(node)} style="width:${size}px;height:${size}px;${marginTop}">${typeHtml}<span class="fp-bubble__title">${esc(node.title || node.id)}</span></a>`;
    })
    .join("\n");

  return `<div class="fp-bubbles">\n${items}\n</div>`;
}

// ── marbles ──────────────────────────────────────────────────────────────────

/**
 * Marbles are static markup plus JS *behavior*. The inline transition:none is
 * what browser.js's physics expects to find as the starting state — it is part
 * of the markup contract, not a style preference.
 */
export function renderMarblesHtml(pages) {
  if (!pages.length) return emptyHtml();

  const items = pages
    .map((node, i) => {
      const size = MARBLE_SIZES[i % MARBLE_SIZES.length];
      const marginTop = i % 2 === 1 ? "margin-top:36px;" : "";
      return `<a href="${escAttr(node.id)}" class="fp-marble"${tagsAttr(node)} style="width:${size}px;height:${size}px;transition:none;${marginTop}"><img src="/assets/objects/marble.png" class="fp-marble__img" alt="" aria-hidden="true"><span class="fp-marble__title">${esc(node.title || node.id)}</span></a>`;
    })
    .join("\n");

  return `<div class="fp-marbles">\n${items}\n</div>`;
}

// ── slider ───────────────────────────────────────────────────────────────────

export function renderSliderHtml(pages, settings = {}) {
  const title = settings.title || "ARTICLES";
  if (!pages.length) return emptyHtml("No articles yet.");

  const slides = pages
    .map((node) => {
      const { href, external } = linkAttrs(node);
      const imgHtml = node.image
        ? `<a href="${href}"${external}><img class="articles__image no-pswp" src="${escAttr(node.image)}" alt="${escAttr(node.title || "")}" loading="lazy"></a>`
        : `<div class="articles__image articles__image--placeholder"></div>`;
      return `<div class="swiper-slide articles__content">
          ${imgHtml}
          <div class="articles__inner-content">
            <h3 class="articles__title">${esc(node.title || "")}</h3>
          </div>
          <a href="${href}" class="articles__read-more button-1"${external}>READ MORE</a>
        </div>`;
    })
    .join("");

  return `
      <div class="articles__top-section">
        <p class="label">${esc(title)}</p>
        <div class="swiper-nav">
          <div class="articles__prev-button"></div>
          <div class="articles__next-button"></div>
        </div>
      </div>
      <div class="swiper articles__repeater" id="articles-swiper">
        <div class="swiper-wrapper">${slides}</div>
      </div>`;
}

// ── dispatcher ───────────────────────────────────────────────────────────────

/**
 * The search input markup. Shared by every display mode that supports
 * filtering, so the `--sv-*` token styling applies uniformly.
 */
export function renderSearchHtml(settings = {}) {
  if (isSearchDisabled(settings)) return "";
  const placeholder = escAttr(settings.placeholder || "Search...");
  return `<input type="text" class="fp-search-input" placeholder="${placeholder}" aria-label="Search">
<div class="fp-filter-placeholder"></div>`;
}

/**
 * Render the full inner HTML of a collection for any display mode.
 *
 * `cards` keeps its historical .fp-seo-wrapper structure byte-for-byte — the
 * alter-engineers site depends on it (see collection-invariants.test.js).
 * Other modes wrap in .collection__inner so the search input has a sibling
 * container to filter against.
 */
export function renderCollectionInner(pages, settings = {}) {
  const display = settings.display || "cards";
  const searchHtml = renderSearchHtml(settings);

  if (display === "list")    return `<div class="fp-seo-wrapper">${searchHtml}${renderListHtml(pages)}</div>`;
  if (display === "bubbles") return `<div class="fp-seo-wrapper">${searchHtml}${renderBubblesHtml(pages)}</div>`;
  if (display === "marbles") return `<div class="fp-seo-wrapper">${searchHtml}${renderMarblesHtml(pages)}</div>`;
  // The slider owns its own chrome (title row + nav arrows) and has no filter input.
  if (display === "slider")  return renderSliderHtml(pages, settings);

  const showFields = parseShowFields(settings.show_fields);
  return `<div class="fp-seo-wrapper">${searchHtml}${renderCardGridHtml(pages, { showFields })}</div>`;
}
