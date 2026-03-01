/**
 * Tags Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * The runtime part (fetching tagIndex.json and rendering the cloud/list) lives in browser.js.
 *
 * Code fence syntax (all settings optional):
 *
 *   ```tags
 *   style: cloud        # cloud (default) | list
 *   sort: count         # count (default, biggest first) | alpha
 *   limit: 50           # max tags to show (default: all)
 *   show_count: true    # show count badge (default: true)
 *   ```
 */

import jsYaml from "js-yaml";

export const type = "hybrid";
export const name = "tags";

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
    /<pre><code class="language-tags">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawSettings) => {
    const decoded = decodeHtmlEntities(rawSettings).trim();
    let settings = {};
    if (decoded) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(`[tags] Failed to parse code fence settings: ${e.message}`);
      }
    }
    const settingsJson = JSON.stringify(settings);
    return `<div class="tags-visualizer" data-pagefind-ignore data-tags-settings='${settingsJson}'></div>`;
  });
}
