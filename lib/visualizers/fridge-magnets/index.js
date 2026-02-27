/**
 * Fridge Magnets Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * The runtime part (interactive magnet board) lives in browser.js.
 *
 * Finds ```fridge-magnets ... ``` code fences in rendered HTML
 * (markdown-it renders them as <pre><code class="language-fridge-magnets">...</code></pre>)
 * and replaces them with a container div that browser.js mounts into.
 *
 * The code fence content is YAML with these fields:
 *   cards:  "[One gas burner] [on medium] [equals] ..."  ← bracket-wrapped card strings (auto-layout)
 *           "[One](10,10) [gas burner](80,10) ..."       ← with positions (x,y) for saved layouts
 *   height: 280                                           ← initial canvas height px (optional)
 */

import jsYaml from "js-yaml";

export const type = "hybrid";
export const name = "fridge-magnets";

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function transform(html) {
  const codeBlockPattern =
    /<pre><code class="language-fridge-magnets">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawContent) => {
    const decoded = decodeHtmlEntities(rawContent).trim();

    let settings = {};
    if (decoded) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(
          `[fridge-magnets] Failed to parse code fence settings: ${e.message}`,
        );
      }
    }

    const cards = settings.cards || "";
    const height = settings.height || 280;

    // Encode cards string safely for an HTML attribute
    const safeCards = cards.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

    return `<div class="fridge-magnets-visualizer" data-cards="${safeCards}" data-height="${height}"></div>`;
  });
}
