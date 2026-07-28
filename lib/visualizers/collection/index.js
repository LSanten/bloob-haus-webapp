/**
 * Collection Visualizer — Node host (build time).
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
import { renderCollectionInner, resolveWidth } from "./renderer.js";

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

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

  return renderCollectionInner(pages, settings);
}

/**
 * File-scope shape entry point.
 * Runs at preprocess time, before graph.json exists — emits the settings
 * container. transform() fills it later in the same build.
 */
export function renderFilescope(settings, _body) {
  return buildContainer(JSON.stringify(settings || {}), "", settings || {});
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
    const inner = renderInner(settings, pageUrl);

    if (inner === null) {
      console.warn(
        `[collection] graph.json not available — falling back to runtime render (source: ${settings.source || "all"})`
      );
      return buildContainer(settingsJson, "", settings);
    }

    return buildContainer(settingsJson, inner, settings);
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
