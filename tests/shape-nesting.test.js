/**
 * A nested shape governs its own presentation.
 *
 * When a shape renders inside another shape's body, the container's prose rules
 * must not reach into it. Real regression this guards: melt's pages moved onto
 * the `article` shape, which styles `.article-body a { text-decoration: underline }`
 * (specificity 0,1,1). The collection shape's `.fp-marble { text-decoration: none }`
 * is only (0,1,0), so every marble title in the nested collection came out
 * underlined.
 *
 * The fix is to let the nested shape win by scoping its rules to its own container. (Since
 * 2026-11-03 the article doesn't underline its own links either: links show by their color.)
 *
 * This is the composition the folder-index design depends on
 * (article shape + collection shape inside), so it needs a guard.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

let chromium;
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

afterAll(async () => { if (browser) await browser.close(); });

/** A collection nested inside an article body, as a folder index renders it. */
function nestedPage(display) {
  const pages = [
    { id: "/a/", title: "Alpha", subtitle: "One" },
    { id: "/b/", title: "Beta", subtitle: "Two" },
  ];
  const css = [
    read("themes/melt/assets/css/main.css"),
    read("lib/visualizers/article/styles.css"),
    read("lib/visualizers/collection/styles.css"),
    read("lib/visualizers/folder-preview/styles.css"),
  ].map((c) => `<style>${c}</style>`).join("\n");

  return `${css}<body>
    <article class="article-page">
      <div class="article-body">
        <p>Prose with a <a href="/x/">real prose link</a>, shown by its color.</p>
        <div class="collection-visualizer">${renderer.renderCollectionInner(pages, { display })}</div>
      </div>
    </article>
  </body>`;
}

const NESTED_ITEMS = [
  ["marbles", ".fp-marble"],
  ["bubbles", ".fp-bubble"],
  ["cards", ".fp-card"],
  ["list", ".folder-preview__link"],
];

describe("a collection nested in an article body keeps its own link styling", () => {
  it.each(NESTED_ITEMS)("display: %s — %s is not underlined", async (display, selector) => {
    if (!browser) {
      console.warn("[shape-nesting] no chromium available — skipping");
      return;
    }

    const page = await browser.newPage();
    try {
      await page.setContent(nestedPage(display), { waitUntil: "load" });

      const result = await page.evaluate((sel) => {
        const item = document.querySelector(sel);
        const prose = document.querySelector(".article-body > p > a");
        return {
          found: !!item,
          itemDecoration: item ? getComputedStyle(item).textDecorationLine : null,
          proseDecoration: prose ? getComputedStyle(prose).textDecorationLine : null,
        };
      }, selector);

      expect(result.found, `${selector} not rendered`).toBe(true);
      expect(
        result.itemDecoration,
        `${selector} inherited the article body's underline — the nested shape must win`
      ).toBe("none");

      // The article's own prose links show by their color, no underline (Leon, 2026-11-03).
      expect(result.proseDecoration, "prose links show by their color").toBe("none");
    } finally {
      await page.close();
    }
  }, 60_000);
});
