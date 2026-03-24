/**
 * services Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes it through parser.js → renderer.js, and replaces the section with
 * the final services HTML.
 *
 * Activation:
 *   ::: services id=services
 *   ## Our Services
 *   Description paragraph.
 *   - Service item one
 *   - Service item two
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "services";

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
  const sectionPattern =
    /<section class="services"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn("[services] No data-vis-raw found — skipping transform.");
      return match;
    }

    const data = parse(raw);
    if (!data.heading) {
      console.warn("[services] No heading parsed — skipping transform.");
      return match;
    }

    const settings = parseSettings(attrs);
    return render(data, settings);
  });
}
