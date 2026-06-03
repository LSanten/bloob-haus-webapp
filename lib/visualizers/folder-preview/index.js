/**
 * Folder Preview Visualizer — Build-time Transform
 *
 * Replaces ```folder-preview ... ``` code fences with either:
 *
 *   seo: false (default) — a runtime placeholder div that browser.js populates
 *   from graph.json at page load.
 *
 *   seo: true — fully static card HTML rendered at build time so all content
 *   is present in the page source for search-engine crawlers. browser.js still
 *   runs to attach the search input. Falls back to the runtime placeholder if
 *   graph.json is not yet available.
 *
 * Code fence YAML options:
 *   folder:      folder name to list (required for seo: true; auto-detected at
 *                runtime from URL for seo: false)
 *   seo:         true | false (default false) — build-time static render
 *   show_fields: comma-separated or YAML list of frontmatter fields to display
 *                on each card (requires graph.extra_fields in sites/[site].yaml)
 *   sort:        alpha (default) | reverse-alpha
 *   limit:       max pages to show
 *   style:       list (default) | slider-cards  (only applies when seo: false)
 *   title:       section label above slider-cards (default "ARTICLES")
 *   id:          HTML id on slider-cards section element
 *   bg / color:  background color tokens (slider-cards only)
 */

import jsYaml from "js-yaml";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveBg } from "../_utils/bg-color.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../../..");

export const type = "hybrid";
export const name = "folder-preview";

// Cached graph nodes — loaded once per build process
let _graphCache = null;

function loadGraphNodes() {
  if (_graphCache) return _graphCache;
  const graphPath = join(process.env.SRC_DIR || join(ROOT_DIR, "src"), "graph.json");
  try {
    const graph = JSON.parse(readFileSync(graphPath, "utf-8"));
    _graphCache = graph.nodes || [];
    return _graphCache;
  } catch {
    return [];
  }
}

// Human-readable labels for common project frontmatter fields
const FIELD_LABELS = {
  building_type:     "Type",
  construction_type: "Construction",
  location:          "Location",
  sqft:              "sqft",
  services:          "Services",
  target:            "Target",
  owner:             "Owner",
  architect:         "Architect",
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

function parseShowFields(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((f) => String(f).trim()).filter(Boolean);
  return String(raw).split(",").map((f) => f.trim()).filter(Boolean);
}

/**
 * Build static HTML for the SEO card grid.
 * Returns null if no folder is configured or graph.json is unavailable.
 */
function renderSeoGrid(settings) {
  const folder = settings.folder;
  if (!folder) return null;

  const nodes = loadGraphNodes();
  const showFields = parseShowFields(settings.show_fields);
  const sort = settings.sort || "alpha";
  const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
  const folderIndexId = "/" + folder + "/";

  let pages = nodes.filter(
    (node) =>
      node.section === folder &&
      node.type === "page" &&
      node.id !== folderIndexId &&
      !node.id.endsWith("/index/") &&
      node.website_status !== "archived"
  );

  if (sort === "reverse-alpha") {
    pages.sort((a, b) =>
      (b.title || "").toLowerCase().localeCompare((a.title || "").toLowerCase())
    );
  } else {
    pages.sort((a, b) =>
      (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase())
    );
  }

  if (isFinite(limit)) pages = pages.slice(0, limit);

  if (!pages.length) {
    return `<div class="fp-seo-wrapper"><p class="folder-preview__empty">No pages yet in "${folder}".</p></div>`;
  }

  const cards = pages.map((node) => {
    const imageHtml = node.image
      ? `<div class="fp-card__image-wrap"><img src="${escapeAttr(node.image)}" alt="${escapeAttr(node.title || "")}" loading="lazy"></div>`
      : `<div class="fp-card__image-wrap fp-card__image-wrap--placeholder"></div>`;

    // data-fp-* attributes for future filter chips — one per show_field
    const filterAttrs = showFields
      .filter((f) => node[f] !== undefined && node[f] !== null)
      .map((f) => {
        const val = Array.isArray(node[f]) ? node[f].join(", ") : String(node[f]);
        return `data-fp-${escapeAttr(f)}="${escapeAttr(val)}"`;
      })
      .join(" ");

    const fieldsHtml =
      showFields.length > 0
        ? `<div class="fp-card__fields">${showFields
            .filter((f) => node[f] !== undefined && node[f] !== null)
            .map((f) => {
              const label = FIELD_LABELS[f] || capitalize(f);
              const val = Array.isArray(node[f]) ? node[f].join(", ") : String(node[f]);
              return `<span class="fp-field"><span class="fp-field__label">${escapeHtml(label)}</span><span class="fp-field__value">${escapeHtml(val)}</span></span>`;
            })
            .join("")}</div>`
        : "";

    return `<a class="fp-card" href="${escapeAttr(node.id)}"${filterAttrs ? " " + filterAttrs : ""}>
  ${imageHtml}
  <div class="fp-card__body">
    <h2 class="fp-card__title">${escapeHtml(node.title || node.id)}</h2>
    ${fieldsHtml}
  </div>
</a>`;
  });

  const placeholder = `<input type="text" class="fp-search-input" placeholder="Search ${escapeAttr(folder)}..." aria-label="Search ${escapeAttr(folder)}">
<div class="fp-filter-placeholder"></div>`;

  return `<div class="fp-seo-wrapper">
${placeholder}
<div class="fp-cards">
${cards.join("\n")}
</div>
</div>`;
}

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
    const decoded = decodeHtmlEntities(rawSettings);
    let settings = {};
    if (decoded.trim()) {
      try {
        // Pass decoded (not trimmed) so consistent leading indentation is preserved —
        // trimming only the first line breaks YAML's indentation model.
        settings = jsYaml.load(decoded) || {};
      } catch (e) {
        console.warn(`[folder-preview] Failed to parse settings: ${e.message}`);
      }
    }
    const settingsJson = JSON.stringify(settings);

    // SEO mode: render static card grid at build time
    if (settings.seo === true || settings.seo === "true") {
      const seoHtml = renderSeoGrid(settings);
      if (seoHtml) {
        // Still include data-fp-settings so browser.js can attach search
        return `<div class="folder-preview-visualizer" data-pagefind-ignore data-fp-settings='${settingsJson}'>${seoHtml}</div>`;
      }
      // graph.json not yet available — fall through to runtime placeholder
      console.warn(`[folder-preview] seo: true but graph.json not available — falling back to runtime render for folder "${settings.folder}"`);
    }

    // slider-cards: wrap in .articles section so theme CSS rules apply
    if (settings.style === "slider-cards") {
      const sectionId = settings.id || "articles";
      const { extraClass, style } = resolveBg({ bg: settings.bg, color: settings.color });
      const styleAttr = style ? ` style="${style}"` : "";
      return `<section class="articles${extraClass}" id="${sectionId}"${styleAttr}><div class="articles__wrapper maxwidth"><div class="folder-preview-visualizer" data-pagefind-ignore data-fp-settings='${settingsJson}'></div></div></section>`;
    }

    return `<div class="folder-preview-visualizer" data-pagefind-ignore data-fp-settings='${settingsJson}'></div>`;
  });
}
