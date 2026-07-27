/**
 * CSS independence — a shape must render the same whether or not OTHER shapes'
 * stylesheets are loaded.
 *
 * This is the safety net for per-page visualizer loading (TECH-DEBT #4): that
 * feature works by NOT loading stylesheets a page doesn't use, so any shape
 * silently depending on another shape's CSS would change appearance the moment
 * it ships.
 *
 * `collection` and `folder-preview` share 11 `fp-*` class names and
 * folder-preview.css loads later (alphabetical), so it won every tie — AE's
 * collection cards were in fact being styled by folder-preview (TECH-DEBT #41).
 * Fixed 2026-07-27 by scoping the three rules that actually diverged.
 *
 * Uses a real browser because CSS cascade + custom-property fallback chains
 * cannot be evaluated by reading the files. Skips cleanly when no chromium is
 * available (e.g. CI without a browser cache) rather than failing the suite.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const THEMES = ["alter-engineers", "melt", "marbles-pouch", "warm-kitchen"];

// Properties broad enough to catch layout, colour, and type regressions.
const PROPS = [
  "borderRadius", "backgroundColor", "borderTopWidth", "borderTopColor", "borderTopStyle",
  "overflow", "transitionProperty", "display", "flexDirection", "gridTemplateColumns",
  "gap", "padding", "color", "fontSize", "fontWeight", "textTransform", "letterSpacing",
  "aspectRatio", "objectFit", "textDecorationLine", "boxShadow", "lineHeight", "margin",
  "fontFamily", "width", "height",
];

const TARGETS = [
  ".fp-cards", ".fp-card", ".fp-card__image-wrap", ".fp-card__body",
  ".fp-card__title", ".fp-card__subtitle", ".fp-card__fields",
  ".fp-seo-wrapper", ".fp-search-input",
  ".fp-marbles", ".fp-marble", ".fp-marble__img", ".fp-marble__title",
  ".fp-bubbles", ".fp-bubble", ".fp-bubble__type", ".fp-bubble__title",
  ".folder-preview__list", ".folder-preview__item", ".folder-preview__link",
  ".folder-preview__icon", ".fp-filter-placeholder",
  ".articles__title", ".articles__image", ".swiper-slide",
];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

let chromium = null;
let browser = null;
let markup = "";

beforeAll(async () => {
  try {
    ({ chromium } = await import("@playwright/test"));
    browser = await chromium.launch();
  } catch {
    browser = null; // no browser available — tests below self-skip
    return;
  }

  // Real markup from the real renderer, covering every display mode.
  const renderer = await import("../lib/visualizers/collection/renderer.js");
  const pages = [
    { id: "/a/", title: "Alpha", subtitle: "Sub", image: "/x.jpg", content_type: "Article", bloobIcon: "/i.png" },
    { id: "/b/", title: "Beta" },
  ];
  markup = ["cards", "list", "bubbles", "marbles", "slider"]
    .map((d) => `<div class="collection-visualizer">${renderer.renderCollectionInner(pages, { display: d })}</div>`)
    .join("\n");
}, 60_000);

afterAll(async () => { if (browser) await browser.close(); });

/** Load order mirrors the real <head>: theme main.css, then visualizer CSS alphabetically. */
function buildPage(theme, withFolderPreview) {
  const css = [
    read(`themes/${theme}/assets/css/main.css`),
    read("lib/visualizers/collection/styles.css"),
    withFolderPreview ? read("lib/visualizers/folder-preview/styles.css") : "",
    read("lib/visualizers/search/styles.css"),
  ];
  return `${css.map((c) => `<style>${c}</style>`).join("\n")}<body>${markup}</body>`;
}

async function snapshot(page, theme, withFolderPreview) {
  await page.setContent(buildPage(theme, withFolderPreview), { waitUntil: "load" });
  return page.evaluate(
    ({ targets, props }) => {
      const out = {};
      for (const sel of targets) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const cs = getComputedStyle(el);
        out[sel] = Object.fromEntries(props.map((k) => [k, cs[k]]));
      }
      return out;
    },
    { targets: TARGETS, props: PROPS }
  );
}

describe("collection renders identically without folder-preview.css (TECH-DEBT #41)", () => {
  it.each(THEMES)("theme: %s", async (theme) => {
    if (!browser) {
      console.warn("[css-independence] no chromium available — skipping");
      return;
    }

    const page = await browser.newPage();
    try {
      const withFP = await snapshot(page, theme, true);
      const withoutFP = await snapshot(page, theme, false);

      // Guard: if the harness rendered nothing, the comparison proves nothing.
      expect(Object.keys(withFP).length, "no target elements matched — harness broken").toBeGreaterThan(10);

      const differences = [];
      for (const sel of Object.keys(withFP)) {
        for (const prop of PROPS) {
          if (withFP[sel][prop] !== withoutFP[sel]?.[prop]) {
            differences.push(`${sel} { ${prop}: "${withFP[sel][prop]}" -> "${withoutFP[sel]?.[prop]}" }`);
          }
        }
      }

      expect(
        differences,
        `collection.css depends on folder-preview.css for these — per-page loading (#4) would change them:\n  ${differences.join("\n  ")}`
      ).toEqual([]);
    } finally {
      await page.close();
    }
  }, 60_000);
});
