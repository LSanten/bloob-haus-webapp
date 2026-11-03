/**
 * Content that arrives after an object opened (the graph, comments, late images) is never cut
 * off: once open, the object's page grows freely. Skips when Chromium is not installed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderObject } from "../../lib/visualizers/_engine/render.js";
import { loadTemplateShapes } from "../../scripts/utils/template-shapes.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, toolbox = "", css = "", shapes;
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  toolbox = (await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false })).outputFiles[0].text;
  css = ["lib/visualizers/_engine/engine.css", "lib/visualizers/marble/styles.css", "lib/visualizers/note/styles.css"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf-8")).join("\n");
  shapes = await loadTemplateShapes(path.join(ROOT, "lib/visualizers"));
});
afterAll(async () => browser?.close());

describe.each(["marble", "note"])("a %s that grows after it opened", (name) => {
  it("shows the late content in full", async () => {
    if (!browser) return;
    const obj = renderObject(shapes.get(name), { data: { title: "T" }, html: "<p>words</p>", url: "/a/", pageId: "a" }, { inside: '<div class="sheet-inside"><p>words</p></div>' });
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html class="bh-js" data-bh-initial="closed"><head><style>${css}</style></head><body>${obj}<script>${toolbox}</script></body></html>`);
    await page.click("[data-bloob-toggle]");
    await page.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open", null, { timeout: 5000 });
    await page.evaluate(() => {
      const late = document.createElement("div");
      late.id = "late";
      late.style.height = "900px";
      (document.querySelector(".sheet-inside") || document.querySelector(".note-text")).append(late);
    });
    const bottoms = await page.evaluate(() => ({
      late: document.getElementById("late").getBoundingClientRect().bottom,
      object: document.querySelector(".bloob-object").getBoundingClientRect().bottom,
    }));
    expect(bottoms.object).toBeGreaterThanOrEqual(bottoms.late - 1);
    await page.close();
  });
});

describe("arriving closed or playing", () => {
  it.each(["closed", "play"])("before script runs (%s), the page is held shut: nothing unfolded flashes", async (initial) => {
    if (!browser) return;
    const obj = renderObject(shapes.get("marble"), { data: { title: "T" }, html: "<p>words</p>", url: "/a/", pageId: "a" }, { inside: '<div style="height:600px">inside</div>' });
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html class="bh-js" data-bh-initial="${initial}"><head><style>${css}</style></head><body>${obj}</body></html>`);
    expect(await page.$eval(".bloob-object__open", (e) => e.getBoundingClientRect().height)).toBeLessThan(2);
    await page.close();
  });
});
