/**
 * Award Badge Visualizer — build-time transform
 *
 * Awards and certifications are facts about the whole page, so they live in
 * frontmatter (`awards:` / `certifications:` lists, see schema.md). Build-time
 * transforms can't read frontmatter, so a layout drops a slot that carries it:
 *
 *   {% if awards or certifications %}
 *   <div class="award-badge-slot" data-style="tab" data-placement="hero"
 *        data-awards="{{ awards | dump | escape }}"
 *        data-certifications="{{ certifications | dump | escape }}"></div>
 *   {% endif %}
 *
 * This transform replaces each slot with the rendered badges. Optional slot
 * attributes: data-style (tab | seal | line), data-edge (wax | scallop | star |
 * circle | ribbon), data-placement (a word added as a wrapper class).
 */

import { parseEntries } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "award-badge";

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(attrs, key) {
  const m = attrs.match(new RegExp(`data-${key}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : "";
}

function json(attrs, key) {
  const raw = attr(attrs, key);
  if (!raw || raw === "undefined" || raw === "null") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(`[award-badge] Could not read data-${key} — ignoring it.`);
    return undefined;
  }
}

export function transform(html) {
  if (!html.includes("award-badge-slot")) return html;
  return html.replace(/<div class="award-badge-slot"([^>]*)><\/div>/g, (match, attrs) => {
    const entries = parseEntries({ awards: json(attrs, "awards"), certifications: json(attrs, "certifications") });
    return render(entries, {
      style: attr(attrs, "style"),
      edge: attr(attrs, "edge"),
      placement: attr(attrs, "placement"),
    });
  });
}
