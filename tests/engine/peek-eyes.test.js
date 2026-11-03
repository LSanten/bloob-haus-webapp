/**
 * Peek eyes: a small eye beside links to other pages of the site. Its click peeks (a smaller card
 * over a blurred page); a click outside closes it; the tool belt can hide the eyes.
 * Skips when Chromium is not installed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, toolbox = "", css = "";
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  toolbox = (await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false })).outputFiles[0].text;
  css = ["lib/visualizers/_engine/engine.css", "themes/bloob-haus-26/assets/css/main.css"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf-8")).join("\n");
});
afterAll(async () => browser?.close());

const belt = `<div class="toolbelt"><button class="toolbelt__open" type="button" aria-expanded="false"></button><div class="toolbelt__panel" hidden>
<label><input type="checkbox" data-setting="bh-peek-eyes" data-default="on"> Peek eyes</label></div></div>`;
const home = () => `<!doctype html><html class="bh-js"><head><style>${css}</style></head><body><main><div class="page-content">
<p>Read <a id="in" href="/marbles/glass/">the glass</a>, or <a id="out" href="https://example.com/">elsewhere</a>, or <a id="tag" href="/tags/yoga/">yoga</a>.</p></div></main>${belt}<script>${toolbox}</script></body></html>`;
const object = `<!doctype html><html><body><div class="bloob-object bloob-object--marble" data-shape="marble" data-opens="click"><div class="bloob-object__closed"><p>Glass</p></div><div class="bloob-object__open"><p>inside words</p></div></div></body></html>`;

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.route("https://test.local/**", (r) => r.fulfill({ contentType: "text/html", body: new URL(r.request().url()).pathname === "/" ? home() : object }));
  const page = await ctx.newPage();
  await page.goto("https://test.local/");
  return { ctx, page };
}

describe("peek eyes", () => {
  it("sit beside links to other pages of the site only", async () => {
    if (!browser) return;
    const { ctx, page } = await open();
    expect(await page.$$eval(".bloob-peek-eye", (e) => e.length)).toBe(1);
    expect(await page.$eval("#in + .bloob-peek-eye", (e) => e.getAttribute("aria-label"))).toContain("Peek");
    await ctx.close();
  });

  it("an eye opens a smaller peek over a blurred page, and a click outside closes it", async () => {
    if (!browser) return;
    const { ctx, page } = await open();
    await page.click(".bloob-peek-eye");
    await page.waitForSelector(".bloob-peek .bloob-object");
    expect(page.url()).toBe("https://test.local/");
    const look = await page.evaluate(() => ({
      blur: getComputedStyle(document.querySelector(".bloob-peek")).backdropFilter,
      width: document.querySelector(".bloob-peek__stage").getBoundingClientRect().width,
    }));
    expect(look.blur).toContain("blur");
    expect(look.width).toBeLessThan(800);
    await page.mouse.click(30, 700);
    expect(await page.$$eval(".bloob-peek", (e) => e.length)).toBe(0);
    await ctx.close();
  });

  it("the tool belt can hide them", async () => {
    if (!browser) return;
    const { ctx, page } = await open();
    await page.click(".toolbelt__open");
    await page.uncheck('input[data-setting="bh-peek-eyes"]');
    expect(await page.$eval(".bloob-peek-eye", (e) => getComputedStyle(e).display)).toBe("none");
    await ctx.close();
  });
});
