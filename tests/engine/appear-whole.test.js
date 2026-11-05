/**
 * An object appears whole: one whose look is built from layers (the marble's live glass, the
 * vinyl sleeve's 3D) waits, invisible, until its own script says it is assembled, then fades in
 * as one piece. A CSS fallback shows it after 3 s anyway; without script it simply shows.
 * Its opening waits too. Skips the browser parts without Chromium.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderObject } from "../../lib/visualizers/_engine/render.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const engineCss = fs.readFileSync(path.join(ROOT, "lib/visualizers/_engine/engine.css"), "utf-8");
let browser = null, toolbox = "";
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  toolbox = (await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false })).outputFiles[0].text;
});
afterAll(async () => browser?.close());

const shape = { name: "glassy", manifest: { name: "glassy", opens: "click", assembles: true }, templates: { open: "<p>{{ body }}</p>", closed: '<button data-bloob-toggle>ball</button>' } };
const obj = () => renderObject(shape, { data: { title: "T" }, html: "words", url: "/a/", pageId: "a" });

describe("appear whole", () => {
  it("a shape that assembles says so on its object", () => expect(obj()).toContain('data-assembles="true"'));

  it("the engine holds it invisible until assembled, with a 3 s CSS fallback", () => {
    expect(engineCss).toMatch(/\[data-assembles\]:not\(\.is-assembled\)[^{]*\{[^}]*opacity:\s*0/);
    expect(engineCss).toMatch(/animation:[^;]*3s/);
  });

  it("in a browser: hidden until its script says it is assembled; the opening waits for that", async () => {
    if (!browser) return;
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html class="bh-js" data-bh-initial="closed"><head><style>${engineCss}</style></head><body>${obj()}<script>${toolbox}</script></body></html>`);
    const opacity = () => page.$eval(".bloob-object", (e) => parseFloat(getComputedStyle(e).opacity));
    expect(await opacity()).toBe(0);
    await page.click("[data-bloob-toggle]", { force: true });
    await page.waitForTimeout(400);
    expect(await page.$eval(".bloob-object", (e) => parseFloat(e.style.getPropertyValue("--open")))).toBe(0);
    await page.evaluate(() => window.BloobObjects.assembled(document.querySelector(".bloob-object")));
    await page.waitForTimeout(500);
    expect(await opacity()).toBe(1);
    await page.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open", null, { timeout: 4000 });
    await page.close();
  });

  it("in a browser: never stuck hidden (the fallback shows it after 3 s)", async () => {
    if (!browser) return;
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html class="bh-js"><head><style>${engineCss}</style></head><body>${obj()}</body></html>`);
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector(".bloob-object")).opacity) === 1, null, { timeout: 6000 });
    await page.close();
  });
});
