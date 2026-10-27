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

/**
 * A hand-written list is a curated handful of cards, so it has no search box
 * unless `search:` asks for one. Every query source keeps search on by default.
 */
export function isSearchDisabled(settings = {}) {
  if (settings.search === undefined || settings.search === null) {
    return Array.isArray(settings.items);
  }
  return settings.search === "off" || settings.search === false;
}

/** The widths a shape may ask for. See docs/architecture/shapes.md → Width preference. */
export const WIDTHS = ["prose", "wide", "full"];

/**
 * Resolve a shape's width preference.
 *
 * Precedence mirrors the chrome model in shapes.md open question #2, so this
 * adds a property to an existing declaration model rather than a second one:
 *   instance (`width:` in the fence) > shape default (manifest.json) > "prose"
 *
 * An unknown or malformed value falls back to "prose" SILENTLY rather than
 * throwing — same contract as an unknown `bloob-shape:`. A typo must never
 * break a page, and the theme is the final arbiter anyway: if it defines no
 * wide width, "wide" renders exactly like "prose".
 */
export function resolveWidth(settings = {}, shapeDefault = "prose") {
  const raw = settings.width ?? shapeDefault;
  const value = String(raw ?? "").trim().toLowerCase();
  return WIDTHS.includes(value) ? value : "prose";
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

// ── post cards (`show:`) ─────────────────────────────────────────────────────
//
// `show: image, date, excerpt, tags` turns a card into a post card: image on
// top, title, date, a short excerpt and tags, like the feed on leonsanten.info.
// Without `show:` the card above renders exactly as it always has (the
// alter-engineers projects grid depends on that, byte for byte).

/** The parts a post card can show. The title is always shown. */
export const CARD_PARTS = ["image", "subtitle", "date", "excerpt", "tags"];

export function parseShow(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const list = Array.isArray(raw) ? raw : String(raw).split(",");
  const parts = list.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
  if (parts.includes("all")) return new Set(CARD_PARTS);
  return new Set(parts.filter((p) => CARD_PARTS.includes(p)));
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2024-08-23" → "August 2024". Anything unreadable → "". */
export function formatCardDate(value) {
  const m = /^(\d{4})-(\d{2})/.exec(String(value ?? "").trim());
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : "";
}

/** Default excerpt: 30 words. */
export const DEFAULT_EXCERPT_LENGTH = 30;

/**
 * Shorten an excerpt. `length` is a word count (`30`, `"30 words"`) or a
 * sentence count (`"2 sentences"`). A cut inside a sentence ends in "…";
 * whole sentences end on their own punctuation.
 */
export function truncateExcerpt(text, length = DEFAULT_EXCERPT_LENGTH) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const spec = /^\s*(\d+)\s*(sentences?|words?)?\s*$/i.exec(String(length ?? ""));
  const count = spec ? parseInt(spec[1], 10) : DEFAULT_EXCERPT_LENGTH;
  if (!count) return "";

  if (spec && /^sentence/i.test(spec[2] || "")) {
    const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [clean];
    if (sentences.length <= count) return clean;
    return sentences.slice(0, count).join("").trim();
  }

  const words = clean.split(" ");
  if (words.length <= count) return clean;
  return words.slice(0, count).join(" ").replace(/[,;:.\-]+$/, "") + "…";
}

/** Columns a card grid asks for (1–6), or null for the theme's default ladder. */
export function parseColumns(raw) {
  const n = parseInt(raw, 10);
  return n >= 1 && n <= 6 ? n : null;
}

/**
 * Render one post card. Expects the node to carry `excerpt`, `date` and
 * `card_tags` when the host has them (index.js adds them from pagePreviews.json).
 */
export function renderPostCardHtml(node, { show, showFields = [], excerptLength } = {}) {
  const { href, external } = linkAttrs(node);
  const tags = Array.isArray(node.card_tags) ? node.card_tags : Array.isArray(node.tags) ? node.tags : [];
  const tagsData = tags.length ? ` data-fp-tags="${escAttr(tags.join(" "))}"` : "";

  let imageHtml = "";
  if (show.has("image")) {
    if (node.image) {
      imageHtml = `<div class="fp-card__image-wrap"><img class="no-pswp" src="${escAttr(node.image)}" alt="" loading="lazy" decoding="async"></div>`;
    } else {
      // No picture: a soft tinted panel (with the page's shape icon when it has
      // one) keeps the grid even. Never an <img> without a source.
      const icon = node.bloobIcon
        ? `<img class="fp-card__placeholder-icon" src="${escAttr(node.bloobIcon)}" alt="" aria-hidden="true" loading="lazy">`
        : "";
      imageHtml = `<div class="fp-card__image-wrap fp-card__image-wrap--placeholder">${icon}</div>`;
    }
  }

  const subtitleHtml =
    show.has("subtitle") && node.subtitle ? `<p class="fp-card__subtitle">${esc(node.subtitle)}</p>` : "";

  const meta = [];
  const date = show.has("date") ? formatCardDate(node.date) : "";
  if (date) meta.push(`<time class="fp-card__date" datetime="${escAttr(String(node.date).slice(0, 10))}">${esc(date)}</time>`);
  if (node.external && node.host) meta.push(`<span class="fp-card__host">${esc(node.host)}</span>`);
  const metaHtml = meta.length ? `<p class="fp-card__meta">${meta.join("")}</p>` : "";

  const excerpt = show.has("excerpt") ? truncateExcerpt(node.excerpt, excerptLength) : "";
  const excerptHtml = excerpt ? `<p class="fp-card__excerpt">${esc(excerpt)}</p>` : "";

  const tagsHtml =
    show.has("tags") && tags.length
      ? `<span class="fp-card__tags">${tags.map((t) => `<span class="fp-card__tag">${esc(t)}</span>`).join("")}</span>`
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

  const body = [`<span class="fp-card__title">${esc(node.title || node.id)}</span>`, subtitleHtml, metaHtml, excerptHtml, fieldsHtml, tagsHtml]
    .filter(Boolean)
    .join("\n    ");

  return `<a class="fp-card fp-card--post" href="${href}"${external}${tagsData}>
  ${imageHtml}
  <div class="fp-card__body">
    ${body}
  </div>
</a>`;
}

/**
 * Render an array of nodes as a card grid HTML string.
 *
 * `show` (post cards) and `columns` are opt-in: with neither set, the output is
 * the historical grid, unchanged.
 */
export function renderCardGridHtml(
  pages,
  { showFields = [], emptyLabel = "No pages yet.", show = null, columns = null, excerptLength } = {},
) {
  if (!pages.length) return emptyHtml(emptyLabel);
  const cols = parseColumns(columns);
  const cls = cols ? `fp-cards fp-cards--cols fp-cards--cols-${cols}` : "fp-cards";
  const cards = show
    ? pages.map((n) => renderPostCardHtml(n, { show, showFields, excerptLength }))
    : pages.map((n) => renderCardHtml(n, { showFields }));
  return `<div class="${cls}">\n${cards.join("\n")}\n</div>`;
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
  const grid = renderCardGridHtml(pages, {
    showFields,
    show: parseShow(settings.show),
    columns: settings.columns,
    excerptLength: settings.excerpt_length,
  });
  return `<div class="fp-seo-wrapper">${searchHtml}${grid}</div>`;
}
