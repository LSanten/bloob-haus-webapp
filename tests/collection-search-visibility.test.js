/**
 * Collection search filtering must actually HIDE things.
 *
 * browser.js filters by setting `el.hidden = true`. The UA stylesheet turns that
 * into `display: none` — but ONLY if nothing else sets `display`. Both
 * `.fp-marble` and `.fp-bubble` are `display: flex`, which silently wins, so the
 * property flipped and the element stayed on screen. `.fp-card[hidden]` already
 * existed for exactly this reason; marbles and bubbles were missed when they
 * gained a search input (2026-07-27).
 *
 * Asserting `el.hidden === true` CANNOT catch this — that is just reading back
 * the value the filter set. These tests measure rendered visibility instead.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

// Every display mode that renders a filterable item alongside a search input.
const FILTERABLE = [
  ["cards", ".fp-card"],
  ["list", ".folder-preview__item"],
  ["bubbles", ".fp-bubble"],
  ["marbles", ".fp-marble"],
];

let browser = null;
let renderer = null;

beforeAll(async () => {
  try {
    ({ chromium } = await import("@playwright/test"));
    browser = await chromium.launch();
  } catch {
    browser = null;
    return;
  }
  renderer = await import("../lib/visualizers/collection/renderer.js");
}, 60_000);

let chromium;
afterAll(async () => { if (browser) await browser.close(); });

function pageFor(display) {
  const pages = [
    { id: "/a/", title: "Alpha", subtitle: "One", content_type: "Article" },
    { id: "/b/", title: "Beta", subtitle: "Two", content_type: "Article" },
  ];
  const css = [
    read("themes/melt/assets/css/main.css"),
    read("lib/visualizers/collection/styles.css"),
    read("lib/visualizers/folder-preview/styles.css"),
    read("lib/visualizers/search/styles.css"),
  ].map((c) => `<style>${c}</style>`).join("\n");

  return `${css}<body><div class="collection-visualizer">${renderer.renderCollectionInner(
    pages,
    { display }
  )}</div></body>`;
}

describe("search filtering visually hides items in every display mode", () => {
  it.each(FILTERABLE)("display: %s — [hidden] removes the item from layout", async (display, selector) => {
    if (!browser) {
      console.warn("[search-visibility] no chromium available — skipping");
      return;
    }

    const page = await browser.newPage();
    try {
      await page.setContent(pageFor(display), { waitUntil: "load" });

      const result = await page.evaluate((sel) => {
        const items = [...document.querySelectorAll(sel)];
        if (items.length < 2) return { error: `expected 2+ ${sel}, got ${items.length}` };

        const target = items[0];
        const visibleBefore = target.getBoundingClientRect().height > 0;

        // Exactly what browser.js does when the query does not match.
        target.hidden = true;

        const rect = target.getBoundingClientRect();
        return {
          visibleBefore,
          stillRendered: rect.height > 0 || rect.width > 0,
          display: getComputedStyle(target).display,
        };
      }, selector);

      expect(result.error).toBeUndefined();
      expect(result.visibleBefore, `${selector} should be visible to begin with`).toBe(true);
      expect(
        result.stillRendered,
        `${selector} is still rendered after hidden=true (computed display: "${result.display}") — ` +
          `a display rule is overriding the UA [hidden] style; add a scoped [hidden] { display: none } rule`
      ).toBe(false);
    } finally {
      await page.close();
    }
  }, 60_000);
});
