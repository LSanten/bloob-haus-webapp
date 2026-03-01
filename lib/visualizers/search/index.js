/**
 * Search Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * The runtime part (PagefindUI mounting) lives in browser.js.
 *
 * What this transform does:
 *   Finds ```search ... ``` code fences in the rendered HTML output
 *   and replaces them with a container div that browser.js mounts into.
 *
 * Code fence syntax (all settings optional):
 *
 *   ```search
 *   placeholder: Search my marbles...
 *   ```
 *
 * All YAML keys are passed through to PagefindUI as overrides.
 * `placeholder` is a shorthand for `translations.placeholder`.
 */

import jsYaml from "js-yaml";

export const type = "hybrid";
export const name = "search";

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
    /<pre><code class="language-search">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawSettings) => {
    const decoded = decodeHtmlEntities(rawSettings).trim();
    let settings = {};
    if (decoded) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(`[search] Failed to parse code fence settings: ${e.message}`);
      }
    }
    const settingsJson = JSON.stringify(settings);
    return `<div class="search-visualizer" data-pagefind-ignore data-search-settings='${settingsJson}'></div>`;
  });
}
