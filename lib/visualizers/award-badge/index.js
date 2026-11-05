/**
 * Award Badge Visualizer — build-time transform
 *
 * Awards and certifications are facts about the whole page, so they live in
 * frontmatter (`awards:` / `certifications:` lists, see schema.md). Two ways in:
 *
 * 1. A layout drops a slot carrying the page's frontmatter (transforms can't read it):
 *
 *      {% if awards or certifications %}
 *      <div class="award-badge-slot" data-style="tab" data-placement="hero"
 *           data-awards="{{ awards | dump | escape }}"
 *           data-certifications="{{ certifications | dump | escape }}"></div>
 *      {% endif %}
 *
 * 2. Cards drawn by other shapes (collection's .fp-card, card-preview's
 *    .projects__container): when graph.json nodes carry `awards` / `certifications`
 *    (add them to graph.extra_fields in the site yaml), each card linking to such a
 *    page gets icon seals pinned to its image. Opt-in by config: a site whose graph
 *    has no such fields sees no change. Matches markup only, imports no other shape.
 */

import { readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseEntries } from "./parser.js";
import { render } from "./renderer.js";

export const type = "build-time";
export const name = "award-badge";
// After collection / card-preview (0) have drawn their cards, before foldable (100).
export const transformOrder = 50;

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

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

/** Pure: graph nodes → Map(url → entries) for the pages that have any. */
export function indexAwards(nodes = []) {
  const map = new Map();
  for (const n of nodes) {
    if (!n || !n.id || (n.awards == null && n.certifications == null)) continue;
    const entries = parseEntries({ awards: n.awards, certifications: n.certifications });
    if (entries.length) map.set(n.id, entries);
  }
  return map;
}

/** Pure: pin icon seals onto cards whose link has entries in `byUrl`. */
export function decorateCards(html, byUrl) {
  if (!byUrl || !byUrl.size) return html;
  const icons = (url) => {
    const key = decodeURI(url);
    const entries = byUrl.get(key) || byUrl.get(url);
    return entries ? render(entries, { style: "icon", placement: "card" }) : "";
  };
  // collection cards: <a class="fp-card…" href="X"…> … <div class="fp-card__image-wrap…">
  html = html.replace(
    /(<a class="fp-card[^"]*" href="([^"]+)"[^>]*>\s*<div class="fp-card__image-wrap[^"]*">)(?!<div class="award-badges)/g,
    (m, open, href) => open + icons(href),
  );
  // card-preview cards: <a class="projects__container…" href="X"> … <div class="projects__image">
  html = html.replace(
    /(<a class="projects__container[^"]*" href="([^"]+)">[\s\S]{0,400}?<div class="projects__image">)(?!<div class="award-badges)/g,
    (m, open, href) => open + icons(href),
  );
  return html;
}

let _graphCache = { mtime: -1, map: new Map() };
function loadAwardIndex() {
  try {
    const graphPath = join(process.env.SRC_DIR || join(ROOT_DIR, "src"), "graph.json");
    const mtime = statSync(graphPath).mtimeMs;
    if (mtime !== _graphCache.mtime) {
      _graphCache = { mtime, map: indexAwards(JSON.parse(readFileSync(graphPath, "utf-8")).nodes) };
    }
  } catch {
    _graphCache = { mtime: -1, map: new Map() };
  }
  return _graphCache.map;
}

export function transform(html) {
  if (html.includes("award-badge-slot")) {
    html = html.replace(/<div class="award-badge-slot"([^>]*)><\/div>/g, (match, attrs) => {
      const entries = parseEntries({ awards: json(attrs, "awards"), certifications: json(attrs, "certifications") });
      return render(entries, {
        style: attr(attrs, "style"),
        edge: attr(attrs, "edge"),
        placement: attr(attrs, "placement"),
      });
    });
  }
  if (html.includes("fp-card__image-wrap") || html.includes("projects__image")) {
    html = decorateCards(html, loadAwardIndex());
  }
  return html;
}
