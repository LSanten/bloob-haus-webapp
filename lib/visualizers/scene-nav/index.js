/**
 * Scene Nav Visualizer — Build-time Transform
 *
 * Hybrid visualizer: this module handles the build-time part.
 * Runtime interactivity (hover glow, click actions) lives in browser.js.
 *
 * What this does:
 *   Finds ::: scene-nav container sections emitted as <section class="scene-nav" data-vis-raw="...">
 *   and replaces them with the rendered scene HTML.
 *
 * Legacy deprecation:
 *   Old ```scene-nav code fences are left untouched but emit a deprecation warning.
 */

import { parse }  from "./parser.js";
import { render } from "./renderer.js";

export const type = "hybrid";
export const name = "scene-nav";

/**
 * Build-time transform: replaces ::: scene-nav container sections with rendered scene HTML.
 * Leaves legacy ```scene-nav code fences untouched (with deprecation warning).
 * @param {string} html - Rendered HTML from Eleventy
 * @returns {string} Modified HTML
 */
export function transform(html) {
  // Match <section class="scene-nav" ... data-vis-raw="BASE64" ...>...</section>
  const sectionPattern =
    /<section\s+class="scene-nav"([^>]*?)data-vis-raw="([^"]+)"([^>]*)>([\s\S]*?)<\/section>/gi;

  let result = html.replace(sectionPattern, (match, before, rawBase64, after, innerHtml) => {
    let data = { backgrounds: [], elements: [] };
    try {
      const rawText = Buffer.from(rawBase64, "base64").toString("utf-8");
      data = parse(rawText);
    } catch (e) {
      console.warn("[scene-nav] Failed to parse raw content:", e.message);
    }

    if (!data.elements.length && !data.backgrounds.length) {
      return match;
    }

    return render(data);
  });

  // Legacy deprecation: warn if old code fences are found
  if (/<pre><code class="language-scene-nav">/.test(result)) {
    console.warn("[scene-nav] legacy ```scene-nav code fence found — migrate to ::: scene-nav (v2)");
  }

  return result;
}
