/**
 * Card Preview Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes resolved markdown links through parser.js, enriches with graph.json
 * data (title, image), and renders a .projects card grid via renderer.js.
 *
 * Activation:
 *   ::: card-preview limit=4 show_more=true
 *   [[project-slug-a]]
 *   [[project-slug-b]]
 *   :::
 *
 * Settings:
 *   limit     — number of cards visible initially (rest hidden until show_more click)
 *   show_more — true|false; adds the "MORE PROJECTS" toggle button
 *
 * The show_more click handler is already in theme.min.js (.no-visible.hidden toggle).
 * No browser.js needed.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "./parser.js";
import { render } from "./renderer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dirname, "../../../src/graph.json");

export const type = "build-time";
export const name = "card-preview";

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

function parseSettings(attrs) {
  const match = attrs.match(/data-vis-settings='([^']+)'/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

/**
 * Load graph.json and build a url → node map.
 * Returns empty map if graph.json doesn't exist yet.
 */
function loadGraphIndex() {
  try {
    const graph = JSON.parse(readFileSync(GRAPH_PATH, "utf-8"));
    const index = {};
    for (const node of graph.nodes || []) {
      index[node.id] = node;
    }
    return index;
  } catch {
    return {};
  }
}

export function transform(html) {
  const sectionPattern =
    /<section class="card-preview"([^>]*)>[\s\S]*?<\/section>/gi;

  const graphIndex = loadGraphIndex();

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn("[card-preview] No data-vis-raw found — skipping transform.");
      return match;
    }

    const links = parse(raw);
    if (links.length === 0) {
      console.warn("[card-preview] No links parsed — skipping transform.");
      return match;
    }

    // Enrich: merge graph.json data (image, canonical title) into each link
    const items = links.map(({ title, url }) => {
      const node = graphIndex[url];
      return {
        title: node?.title || title,
        url,
        image: node?.image || null,
      };
    });

    const settings = parseSettings(attrs);
    return render(items, settings);
  });
}
