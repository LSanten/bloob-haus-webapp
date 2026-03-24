/**
 * heading-and-paragraph Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes it through parser.js → renderer.js, and replaces the section with
 * the final heading-and-paragraph HTML.
 *
 * Activation:
 *   ::: heading-and-paragraph id=about-us
 *   ## What Drives Us
 *   Body paragraph text here.
 *   :::
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "heading-and-paragraph";

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
    /<section class="heading-and-paragraph"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn("[heading-and-paragraph] No data-vis-raw found — skipping transform.");
      return match;
    }

    const data = parse(raw);
    if (!data.heading) {
      console.warn("[heading-and-paragraph] No heading parsed — skipping transform.");
      return match;
    }

    const settings = parseSettings(attrs);
    return render(data, settings);
  });
}
