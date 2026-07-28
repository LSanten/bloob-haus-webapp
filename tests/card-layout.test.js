/**
 * Card layout rules that must hold for every theme.
 *
 * Two rules live here, both about `display: cards`:
 *
 * 1. THE COLUMN LADDER — 3 columns on desktop, 2 on tablet, 1 on a phone.
 *    `collection/styles.css` already declared the full ladder, but
 *    `folder-preview/styles.css` declared only the 900px -> 2 step and loads
 *    LATER (alphabetical), so its rule won at phone widths and collection's
 *    `560px -> 1fr` never applied. Measured on the live AE build 2026-07-28:
 *    2 columns at 360px, cards 132px wide. Same cascade-collision class as
 *    TECH-DEBT #41.
 *
 *    This test therefore loads BOTH stylesheets in real load order — testing
 *    collection's CSS alone would pass while the real page stayed broken.
 *
 * 2. FIELD LISTS STACK — `show_fields` values get one line each.
 *
 * Deliberately NOT `repeat(auto-fill, minmax(...))`: that makes column count a
 * function of available width, which would silently yield 3 narrow columns on a
 * phone as soon as the container gets wider (see the shape width contract,
 * docs/superpowers/specs/2026-07-28-shape-width-contract-design.md).
 *
 * Uses a real browser because media queries and cascade order cannot be
 * evaluated by reading the files. Self-skips when no chromium is available,
 * matching tests/css-independence.test.js.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const THEMES = ["alter-engineers", "melt", "marbles-pouch", "warm-kitchen"];

/** viewport width -> expected number of card columns */
const LADDER = [
  { width: 1440, columns: 3 },
  { width: 1024, columns: 3 },
  { width: 900, columns: 2 },
  { width: 560, columns: 1 },
  { width: 390, columns: 1 },
  { width: 360, columns: 1 },
];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

let browser = null;
let markup = "";

beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null; // no browser available — tests below self-skip
    return;
  }

  const renderer = await import("../lib/visualizers/collection/renderer.js");
  const pages = [
    {
      id: "/a/",
      title: "Alpha",
      subtitle: "Sub",
      image: "/x.jpg",
      building_type: "School",
      location: "Oakland",
      sqft: "12000",
    },
    { id: "/b/", title: "Beta", subtitle: "Two" },
    { id: "/c/", title: "Gamma", subtitle: "Three" },
  ];
  markup = `<div class="collection-visualizer">${renderer.renderCollectionInner(pages, {
    display: "cards",
    show_fields: "building_type, location, sqft",
  })}</div>`;
}, 60_000);

afterAll(async () => {
  if (browser) await browser.close();
});

/** Mirrors the real <head>: theme main.css, then visualizer CSS alphabetically. */
function buildPage(theme) {
  const css = [
    read(`themes/${theme}/assets/css/main.css`),
    read("lib/visualizers/collection/styles.css"),
    read("lib/visualizers/folder-preview/styles.css"),
  ];
  return `${css.map((c) => `<style>${c}</style>`).join("\n")}<body>${markup}</body>`;
}

describe("card grid column ladder", () => {
  for (const theme of THEMES) {
    for (const { width, columns } of LADDER) {
      it(`${theme}: ${columns} column(s) at ${width}px`, async () => {
        if (!browser) return; // no chromium — skip cleanly
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        try {
          await page.setContent(buildPage(theme), { waitUntil: "load" });
          const actual = await page.evaluate(() => {
            const grid = document.querySelector(".fp-cards");
            if (!grid) return null;
            return getComputedStyle(grid)
              .gridTemplateColumns.split(" ")
              .filter(Boolean).length;
          });
          expect(actual).toBe(columns);
        } finally {
          await page.close();
        }
      });
    }
  }
});

describe("card field lists stack one per line", () => {
  for (const theme of THEMES) {
    it(`${theme}: .fp-card__fields is a column`, async () => {
      if (!browser) return;
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      try {
        await page.setContent(buildPage(theme), { waitUntil: "load" });
        const r = await page.evaluate(() => {
          const el = document.querySelector(".fp-card__fields");
          if (!el) return null;
          const cs = getComputedStyle(el);
          const fields = [...el.querySelectorAll(".fp-field")];
          // Distinct y-offsets == genuinely on separate lines, which is the
          // actual requirement; flex-direction alone could be defeated later.
          const tops = new Set(fields.map((f) => Math.round(f.getBoundingClientRect().top)));
          return {
            flexDirection: cs.flexDirection,
            fieldCount: fields.length,
            distinctLines: tops.size,
          };
        });
        expect(r).not.toBeNull();
        expect(r.flexDirection).toBe("column");
        expect(r.fieldCount).toBeGreaterThan(1);
        expect(r.distinctLines).toBe(r.fieldCount);
      } finally {
        await page.close();
      }
    });
  }
});
