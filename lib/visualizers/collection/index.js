/**
 * Collection Visualizer — Node host (build time).
 *
 * Handles ```collection ... ``` code fences, `:::collection` blocks and
 * bloob-shape: collection pages.
 *
 * Both block forms take the same body: `key: value` settings lines, and
 * optionally a bullet list of links that says exactly which pages get a card,
 * in order (parser.js). The `:::` form is the one to prefer for a list: its
 * links are resolved by the preprocessor like any other link, so they show up
 * in backlinks and the graph, and Obsidian shows them as real links.
 *
 * Settings:
 *   source:      folder=X | tag=X | field:KEY=VAL | all
 *   display:     cards (default) | list | slider | bubbles | marbles
 *   sort:        alpha (default) | reverse-alpha
 *   limit:       max pages to show
 *   show_fields: comma-separated or YAML list of frontmatter fields on each card
 *   search:      off | basics | fulltext (default: combined metadata+fulltext;
 *                off for a hand-written list)
 *   show:        image, subtitle, date, excerpt, tags → post cards (display: cards)
 *   columns:     1-6 card columns on wide screens
 *   excerpt_length: words (30) or "N sentences"
 *   titles:      page (default) | link: use the link text as the card title
 *
 * This file is a HOST, not a renderer: its only jobs are (1) the impure read of
 * graph.json and (2) finding blocks to fill. All markup comes from the pure
 * renderer.js, so every display mode — not just `cards` — ships crawlable HTML.
 *
 * Two entry points, because graph.json is written *between* them:
 *   renderFilescope()  runs during preprocessing, BEFORE graph.json exists →
 *                      emits the settings container only.
 *   transform()        runs inside Eleventy's addTransform, where graph.json
 *                      DOES exist → replaces code fences AND fills any empty
 *                      container left behind by renderFilescope.
 *
 * See docs/architecture/visualizers.md → "The pure-renderer standard".
 */

import jsYaml from "js-yaml";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvePages } from "./resolve.js";
import { renderCollectionInner, resolveWidth, parseShow } from "./renderer.js";
import { splitCollectionBlock, parseLooseSettings } from "./parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../../..");

// The shape's own width default. Read from manifest.json rather than duplicated
// here so `"width"` in the manifest stays the single source of truth — the
// manifest is what a shape author reads and what the future shape catalog lists.
const MANIFEST = JSON.parse(readFileSync(join(__dirname, "manifest.json"), "utf-8"));

export const type = "hybrid";
export const name = "collection";

// Cached graph nodes — loaded once per build process
let _graphCache = null;

function loadGraphNodes() {
  if (_graphCache) return _graphCache;
  const graphPath = join(process.env.SRC_DIR || join(ROOT_DIR, "src"), "graph.json");
  try {
    const graph = JSON.parse(readFileSync(graphPath, "utf-8"));
    _graphCache = graph.nodes || [];
    return _graphCache;
  } catch {
    return [];
  }
}

// Card text the preprocessor keeps per page (excerpt, date, tags). Build data
// only, never served: graph.json is a public file every graph view fetches,
// and excerpts for every page would roughly double it.
let _previewCache = null;

function loadPagePreviews() {
  if (_previewCache) return _previewCache;
  const previewPath = join(process.env.SRC_DIR || join(ROOT_DIR, "src"), "_data", "pagePreviews.json");
  try {
    _previewCache = JSON.parse(readFileSync(previewPath, "utf-8")) || {};
  } catch {
    _previewCache = {};
  }
  return _previewCache;
}

/** Post cards need text graph.json does not carry; add it from pagePreviews.json. */
function withPreviews(pages) {
  const previews = loadPagePreviews();
  return pages.map((n) => {
    const p = previews[n.id];
    if (!p) return n;
    return {
      ...n,
      ...(p.excerpt && { excerpt: p.excerpt }),
      ...(p.date && { date: p.date }),
      ...(p.tags && p.tags.length && { card_tags: p.tags }),
    };
  });
}

/**
 * Parse a collection block body: settings text as YAML (as it always was),
 * plus the hand-written list if there is one.
 *
 * A body without a list goes through exactly the old path, so existing fences
 * parse identically. With a list, settings text that is not valid YAML (a
 * stray line of prose) falls back to one-`key: value`-per-line.
 */
export function parseBlockBody(text) {
  const split = splitCollectionBlock(text);
  const { settingsText } = split;
  // A broken link (private or missing page) gets no card, and its text is not
  // carried into the page either: the settings JSON is part of the HTML.
  const items = split.items.filter((item) => !item.broken);
  if (!split.items.length) {
    if (!text.trim()) return {};
    try {
      return jsYaml.load(text) || {};
    } catch (e) {
      console.warn(`[collection] Failed to parse settings: ${e.message}`);
      return {};
    }
  }

  let settings = {};
  if (settingsText.trim()) {
    try {
      const parsed = jsYaml.load(settingsText);
      settings = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : parseLooseSettings(settingsText);
    } catch {
      settings = parseLooseSettings(settingsText);
    }
  }
  return { ...settings, items };
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * The settings JSON goes into a single-quoted attribute. A link label such as
 * "Leon's notes" would end it early, so quote characters are escaped. The
 * browser decodes them back when browser.js reads the dataset. Settings without
 * `&` or `'` (every collection that existed before lists) are byte-identical.
 */
function settingsAttr(settings) {
  return JSON.stringify(settings || {}).replace(/&/g, "&amp;").replace(/'/g, "&#39;");
}

function buildContainer(settingsJson, inner = "", settings = {}) {
  // data-width is the shape's width PREFERENCE, not an instruction. The theme
  // decides whether it means anything: with no --shape-width-wide defined, a
  // "wide" collection renders at prose measure exactly as before.
  const width = resolveWidth(settings, MANIFEST.width);
  const widthAttr = width === "prose" ? "" : ` data-width="${width}"`;
  return `<div class="collection-visualizer" data-pagefind-ignore data-collection-settings='${settingsJson}'${widthAttr}>${inner}</div>`;
}

/**
 * Resolve + render. Returns null when graph.json is unavailable, so callers can
 * leave an empty container for browser.js to fill rather than emit nothing.
 *
 * @param {object} settings - parsed fence/frontmatter settings
 * @param {string} [pageUrl] - current page URL, excluded from its own listing
 */
function renderInner(settings, pageUrl) {
  const nodes = loadGraphNodes();
  if (!nodes.length) return null;

  let pages = resolvePages(nodes, settings);
  // A collection never lists the page it is sitting on. Folder-index stubs are
  // already dropped by resolve.js; this covers `source: all` on a normal page.
  if (pageUrl) pages = pages.filter((n) => n.id !== pageUrl);
  if (parseShow(settings.show)) pages = withPreviews(pages);

  return renderCollectionInner(pages, settings);
}

/** Render a parsed block into its finished container (or an empty one for browser.js). */
function renderBlock(settings, pageUrl) {
  const settingsJson = settingsAttr(settings);
  const inner = renderInner(settings, pageUrl);
  if (inner === null) {
    console.warn(
      `[collection] graph.json not available, falling back to runtime render (source: ${settings.items ? "list" : settings.source || "all"})`
    );
    return buildContainer(settingsJson, "", settings);
  }
  return buildContainer(settingsJson, inner, settings);
}

function sectionSettings(attrs) {
  const m = attrs.match(/data-vis-settings='([^']*)'/);
  if (!m) return {};
  try {
    return JSON.parse(m[1]) || {};
  } catch {
    return {};
  }
}

function sectionRaw(attrs) {
  const m = attrs.match(/data-vis-raw="([^"]*)"/);
  return m ? Buffer.from(m[1], "base64").toString("utf-8") : "";
}

/**
 * File-scope shape entry point.
 * Runs at preprocess time, before graph.json exists — emits the settings
 * container. transform() fills it later in the same build.
 */
export function renderFilescope(settings, _body) {
  return buildContainer(settingsAttr(settings), "", settings || {});
}

/**
 * Eleventy addTransform: replace ```collection ... ``` code fences, then fill
 * any still-empty container (file-scope pages).
 */
export function transform(html, opts = {}) {
  const pageUrl = opts.pageUrl;

  const codeBlockPattern =
    /<pre><code class="language-collection">([\s\S]*?)<\/code><\/pre>/gi;

  let result = html.replace(codeBlockPattern, (_match, rawSettings) => {
    const settings = parseBlockBody(decodeHtmlEntities(rawSettings));
    return renderBlock(settings, pageUrl);
  });

  // `:::collection` blocks. markdownItContainer renders them as a <section>
  // carrying the block's raw text (data-vis-raw, captured after link
  // resolution) and any `key=value` settings from the opener line. Settings
  // lines inside the block win over the opener line.
  const sectionPattern = /<section class="collection"([^>]*)>[\s\S]*?<\/section>/gi;
  result = result.replace(sectionPattern, (match, attrs) => {
    // Neither a body nor opener settings means the raw text never reached
    // this block (inject-container-raw.js only captures outermost blocks).
    // Rendering it with no settings would list every page on the site, so
    // leave it alone instead.
    if (!/data-vis-raw="/.test(attrs) && !/data-vis-settings='/.test(attrs)) {
      console.warn("[collection] :::collection block has no content to read, left as is.");
      return match;
    }
    const settings = { ...sectionSettings(attrs), ...parseBlockBody(sectionRaw(attrs)) };
    return renderBlock(settings, pageUrl);
  });

  // File-scope pages: renderFilescope left an empty container during
  // preprocessing. graph.json exists now, so fill it.
  // The optional data-width group matters: renderFilescope now emits it, so a
  // pattern that stopped at the settings attribute would no longer match its
  // own output and every file-scope collection would silently stay empty.
  const emptyContainerPattern =
    /<div class="collection-visualizer" data-pagefind-ignore data-collection-settings='([^']*)'(?:\s+data-width="[^"]*")?><\/div>/gi;

  result = result.replace(emptyContainerPattern, (match, settingsJson) => {
    let settings = {};
    try {
      settings = JSON.parse(decodeHtmlEntities(settingsJson)) || {};
    } catch {
      return match;
    }

    const inner = renderInner(settings, pageUrl);
    if (inner === null) return match;

    return buildContainer(settingsJson, inner, settings);
  });

  return result;
}
