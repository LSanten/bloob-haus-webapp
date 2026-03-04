/**
 * Scene Nav Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * Runtime interactivity (hover glow, click actions) lives in browser.js.
 *
 * What this does:
 *   Finds ```scene-nav ... ``` code fences in the rendered HTML output
 *   (markdown-it renders them as <pre><code class="language-scene-nav">...</code></pre>)
 *   and replaces them with the rendered scene HTML + a data attribute
 *   for browser.js to pick up.
 */

import jsYaml from "js-yaml";
import { parse }  from "./parser.js";
import { render } from "./renderer.js";

export const type = "hybrid";
export const name = "scene-nav";

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'");
}

/**
 * Build-time transform: replaces ```scene-nav code fences with rendered scene HTML.
 * @param {string} html - Rendered HTML from Eleventy
 * @returns {string} Modified HTML
 */
export function transform(html) {
  const pattern = /<pre><code class="language-scene-nav">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(pattern, (match, rawContent) => {
    const yaml = decodeHtmlEntities(rawContent).trim();
    let sceneData;

    try {
      sceneData = parse(yaml);
    } catch (e) {
      console.warn(`[scene-nav] Failed to parse code fence: ${e.message}`);
      return match; // Leave original on error
    }

    return render(sceneData);
  });
}
