/**
 * Image Grid Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes it through parser.js → renderer.js, and replaces the section with
 * the final team-grid HTML.
 *
 * data-vis-raw is injected by scripts/utils/inject-container-raw.js during
 * preprocessing, before markdown-it runs. This keeps parser.js pure and
 * shareable across Eleventy, browser live preview, and Obsidian plugin.
 *
 * Activation:
 *   ::: image-grid title="Our Team" id=team
 *   | Photo | Name | Title |
 *   | ----- | ---- | ----- |
 *   | ![[photo.jpg]] | Shannon Allison | Principal |
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "image-grid";

function parseSettings(attrs) {
  const match = attrs.match(/data-vis-settings='([^']+)'/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

export function transform(html) {
  // Match <section class="image-grid" ...>...</section>
  const sectionPattern =
    /<section class="image-grid"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn("[image-grid] No data-vis-raw found — skipping transform.");
      return match;
    }

    const members = parse(raw);
    if (members.length === 0) {
      console.warn("[image-grid] No members parsed — skipping transform.");
      return match;
    }

    const settings = parseSettings(attrs);
    return render(members, settings);
  });
}
