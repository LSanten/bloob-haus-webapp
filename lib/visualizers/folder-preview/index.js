/**
 * Folder Preview Visualizer — Build-time Transform
 *
 * Replaces ```folder-preview ... ``` code fences with a container div
 * that browser.js populates at runtime from graph.json.
 *
 * Code fence YAML options (all optional):
 *   sort:  alpha (default) | reverse-alpha
 *   limit: max pages to show
 */

import jsYaml from "js-yaml";

export const type = "hybrid";
export const name = "folder-preview";

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
    /<pre><code class="language-folder-preview">([\s\S]*?)<\/code><\/pre>/gi;

  return html.replace(codeBlockPattern, (match, rawSettings) => {
    const decoded = decodeHtmlEntities(rawSettings).trim();
    let settings = {};
    if (decoded) {
      try {
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(`[folder-preview] Failed to parse settings: ${e.message}`);
      }
    }
    const settingsJson = JSON.stringify(settings);
    return `<div class="folder-preview-visualizer" data-pagefind-ignore data-fp-settings='${settingsJson}'></div>`;
  });
}
