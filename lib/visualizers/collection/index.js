/**
 * Collection Visualizer — Build-time Transform
 *
 * Handles ```collection ... ``` code fences and bloob-shape: collection pages.
 *
 * Code fence YAML settings:
 *   source:      folder=X | tag=X | field:KEY=VAL | all
 *   display:     cards (default) | list | slider | bubbles | marbles
 *   sort:        alpha (default) | reverse-alpha
 *   limit:       max pages to show
 *   show_fields: comma-separated or YAML list of frontmatter fields on each card
 *   search:      off | basics | fulltext (default: combined metadata+fulltext)
 *
 * Build-time card rendering (display: cards) reads graph.json from disk.
 * All other display modes emit a runtime placeholder for browser.js to fill.
 *
 * renderFilescope() emits a runtime placeholder — graph.json is not yet
 * written at preprocess time. Use a code fence for build-time SEO cards.
 */

import jsYaml from "js-yaml";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvePages } from "./core.js";
import { parseShowFields, renderCardGridHtml } from "./render-card.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../../..");

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

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildPlaceholder(settingsJson) {
  return `<div class="collection-visualizer" data-pagefind-ignore data-collection-settings='${settingsJson}'></div>`;
}

/**
 * File-scope shape entry point.
 * Cannot read graph.json at preprocess time — emits a runtime placeholder.
 * For build-time SEO cards use a ```collection``` code fence instead.
 */
export function renderFilescope(settings, _body) {
  const settingsJson = JSON.stringify(settings || {});
  return buildPlaceholder(settingsJson);
}

/**
 * Eleventy addTransform: replace ```collection ... ``` code fences.
 */
export function transform(html) {
  const codeBlockPattern =
    /<pre><code class="language-collection">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (_match, rawSettings) => {
    const decoded = decodeHtmlEntities(rawSettings);
    let settings = {};
    if (decoded.trim()) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(`[collection] Failed to parse settings: ${e.message}`);
      }
    }

    const settingsJson = JSON.stringify(settings);
    const display = settings.display || "cards";

    // display: cards — attempt build-time SEO grid from graph.json
    if (display === "cards") {
      const nodes = loadGraphNodes();
      if (nodes.length > 0) {
        const showFields = parseShowFields(settings.show_fields);
        const pages = resolvePages(nodes, settings);
        const gridHtml = renderCardGridHtml(pages, { showFields });

        const searchDisabled = settings.search === "off" || settings.search === false;
        const searchHtml = searchDisabled
          ? ""
          : `<input type="text" class="fp-search-input" placeholder="Search..." aria-label="Search">
<div class="fp-filter-placeholder"></div>`;

        const inner = `<div class="fp-seo-wrapper">${searchHtml}${gridHtml}</div>`;
        return `<div class="collection-visualizer" data-pagefind-ignore data-collection-settings='${settingsJson}'>${inner}</div>`;
      }
      // graph.json unavailable — fall through to runtime placeholder
      console.warn(
        `[collection] graph.json not available — falling back to runtime render (source: ${settings.source || "all"})`
      );
    }

    // All other display modes (list, slider, bubbles, marbles): runtime only
    return buildPlaceholder(settingsJson);
  });
}
