/**
 * Share rows in a real browser: hovering a row opens every name, and moving between two buttons
 * never closes it (the row stays open while the pointer is anywhere on it, with a short grace).
 * Both the engine's share row and the site-wide share bar. Skips when Chromium is not installed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import nunjucks from "nunjucks";
import { fileURLToPath } from "url";
import { renderObject } from "../../lib/visualizers/_engine/render.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, toolbox = "", engineCss = "", baseCss = "", shareBar = "";

beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null;
  }
  const out = await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false });
  toolbox = out.outputFiles[0].text;
  engineCss = fs.readFileSync(path.join(ROOT, "lib/visualizers/_engine/engine.css"), "utf-8");
  baseCss = fs.readFileSync(path.join(ROOT, "themes/_base/assets/css/base.css"), "utf-8");
  shareBar = nunjucks.renderString(fs.readFileSync(path.join(ROOT, "themes/_base/partials/share-bar.njk"), "utf-8"), { site: { features: {} } });
});
afterAll(async () => browser?.close());

const shape = { name: "marble", manifest: { name: "marble", opens: "click", shares: true }, templates: { open: "<p>{{ body }}</p>" } };

async function pageWith(body) {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  await page.setContent(`<!doctype html><html class="bh-js"><head><style>${baseCss}${engineCss}</style></head><body style="padding:40px">${body}</body></html>`);
  return page;
}
const labelWidth = (page, sel) => page.$eval(sel, (el) => el.getBoundingClientRect().width);
const center = (page, sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });

describe("share rows in a browser", () => {
  it("the object's share row opens every name on hover and stays open moving between buttons", async () => {
    if (!browser) return;
    const obj = renderObject(shape, { data: { title: "T" }, html: "words", url: "/a/", pageId: "a" });
    const page = await pageWith(`${obj}<script>${toolbox}</script>`);
    await page.mouse.move(...(await center(page, '[data-share-action="link"]')));
    await page.waitForTimeout(400);
    expect(await labelWidth(page, '[data-share-action="pdf"] .bloob-share__label')).toBeGreaterThan(10);
    await page.mouse.move(...(await center(page, '[data-share-action="pdf"]')), { steps: 12 });
    await page.waitForTimeout(400);
    expect(await labelWidth(page, '[data-share-action="link"] .bloob-share__label')).toBeGreaterThan(10);
    await page.mouse.move(5, 500);
    await page.waitForTimeout(800);
    expect(await labelWidth(page, '[data-share-action="link"] .bloob-share__label')).toBeLessThan(2);
  });

  it("the site's share bar stays open while moving between two buttons", async () => {
    if (!browser) return;
    const page = await pageWith(shareBar);
    await page.mouse.move(...(await center(page, ".share-btn--copy")));
    await page.waitForTimeout(400);
    await page.mouse.move(...(await center(page, ".share-btn--embed")), { steps: 12 });
    await page.waitForTimeout(400);
    expect(await labelWidth(page, ".share-btn--copy .share-btn__label")).toBeGreaterThan(10);
    expect(await labelWidth(page, ".share-btn--embed .share-btn__label")).toBeGreaterThan(10);
  });
});
