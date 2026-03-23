/**
 * Testimonials Visualizer — Build-time Transform
 *
 * Reads data-vis-raw (base64 raw markdown) from the rendered <section> element,
 * passes it through parser.js → renderer.js, and replaces the section with
 * a Swiper carousel of testimonial slides.
 *
 * Activation:
 *   ::: testimonials
 *
 *   > Alter Engineers have been a pleasure to work with...
 *   >
 *   > ~ name: JaQuan Cornish
 *   > ~ role: PM at Oakland Unified School District
 *
 *   :::
 *
 * Each blockquote becomes one Swiper slide. The Swiper instance is initialized
 * at runtime by theme.min.js (`new Swiper("#testimonials", ...)`).
 */

import { parse } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "testimonials";

function extractVisRaw(attrs) {
  const match = attrs.match(/data-vis-raw="([^"]+)"/);
  if (!match) return null;
  return Buffer.from(match[1], "base64").toString("utf-8");
}

function parseSettings(attrs) {
  const match = attrs.match(/data-vis-settings='([^']+)'/);
  if (!match) return {};
  try { return JSON.parse(match[1]); } catch { return {}; }
}

export function transform(html) {
  const sectionPattern =
    /<section class="testimonials"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs) => {
    const raw = extractVisRaw(attrs);

    if (!raw) {
      console.warn(
        "[testimonials] No data-vis-raw found — skipping transform.",
      );
      return match;
    }

    const items = parse(raw);
    if (items.length === 0) {
      console.warn("[testimonials] No testimonials parsed — skipping transform.");
      return match;
    }

    const settings = parseSettings(attrs);
    return render(items, settings);
  });
}
