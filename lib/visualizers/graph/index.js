/**
 * Graph Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * The runtime part (force-graph rendering) lives in browser.js.
 *
 * What this transform does:
 *   Finds ```graph ... ``` code fences in the rendered HTML output
 *   (markdown-it renders them as <pre><code class="language-graph">...</code></pre>)
 *   and replaces them with a positioned graph container div that browser.js
 *   will pick up and render into.
 *
 * The bottom-of-page default graph container is handled by the layout template
 * (themes/<name>/layouts/page.njk), not by this transform.
 */

import jsYaml from "js-yaml";

export const type = "hybrid";
export const name = "graph";

/**
 * Decodes HTML entities that markdown-it encodes inside code blocks.
 * @param {string} str
 * @returns {string}
 */
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Build-time transform: replaces ```graph code fences with inline graph containers.
 * @param {string} html - Rendered HTML from Eleventy
 * @returns {string} Modified HTML
 */
export function transform(html) {
  // markdown-it renders ```graph\n...\n``` as:
  // <pre><code class="language-graph">...</code></pre>
  const codeBlockPattern =
    /<pre><code class="language-graph">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawSettings) => {
    const decoded = decodeHtmlEntities(rawSettings).trim();

    let settings = {};
    if (decoded) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(
          `[graph] Failed to parse code fence settings: ${e.message}`,
        );
      }
    }

    // Encode settings as JSON in a data attribute for browser.js to read.
    // Use single quotes on the outer attribute to avoid escaping double quotes.
    const settingsJson = JSON.stringify(settings);

    return `<div class="graph-visualizer" data-graph-position="inline" data-graph-settings='${settingsJson}'></div>`;
  });
}
