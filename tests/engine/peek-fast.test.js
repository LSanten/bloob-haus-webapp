/**
 * A peek is as fast as going to the page (Leon's feedback 1a42c9e2). A peeked marble's live glass
 * comes from marble.js, which a page without marbles of its own (the homepage room) never loads,
 * so nothing ever said "assembled" and every peek sat invisible for the 3 s fallback, then opened.
 * In a peek, the object's finished closed look (the baked glass) is the whole piece: it appears
 * once that picture and the peeked page's stylesheets have loaded, and opens straight away.
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

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
// The homepage: a room marble in a peek area, and no marble.js.
const home = () => `<!doctype html><html class="bh-js"><head><style>${css}</style></head><body><main>
<div data-peek-always><div class="room"><a class="room-object room-object--marble" id="m" href="/marbles/glass/">Glass</a></div></div>
</main><script>${toolbox}</script></body></html>`;
// The marble's own page: an object that assembles, its baked picture, and its own stylesheet.
const marblePage = () => `<!doctype html><html><head><link rel="stylesheet" href="/assets/css/visualizers/marble.css"></head><body><main>
<div class="bloob-object bloob-object--marble" data-shape="marble" data-page-id="glass" data-state="open" data-opens="click" data-assembles="true" style="--open:1">
<div class="bloob-object__closed"><button class="marble-ball" data-bloob-toggle><img data-bloob-picture src="/og/marble/glass.png" width="10" height="10"></button></div>
<div class="bloob-object__open"><div class="marble-open" data-bloob-measure><div class="marble-sheet"><p>inside words</p></div></div></div>
</div></main></body></html>`;

describe("a fast peek", () => {
  it("opens a peeked marble without waiting for a live glass this page never loads", async () => {
    if (!browser) return;
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    await ctx.route("https://test.local/**", (r) => {
      const p = new URL(r.request().url()).pathname;
      if (p === "/") return r.fulfill({ contentType: "text/html", body: home() });
      if (p === "/marbles/glass/") return r.fulfill({ contentType: "text/html", body: marblePage() });
      if (p.endsWith(".png")) return r.fulfill({ contentType: "image/png", body: PNG });
      if (p.endsWith(".css")) return r.fulfill({ contentType: "text/css", body: ".marble-sheet{padding:10px}" });
      return r.fulfill({ status: 404, body: "" });
    });
    const page = await ctx.newPage();
    await page.goto("https://test.local/");
    const t0 = Date.now();
    await page.click("#m");
    await page.waitForSelector(".bloob-peek .bloob-object");
    // shows as one piece, well before the 3 s fallback
    await page.waitForFunction(() => document.querySelector(".bloob-peek .bloob-object").classList.contains("is-assembled"), null, { timeout: 1500 });
    await page.waitForFunction(() => document.querySelector(".bloob-peek .bloob-object").dataset.state === "open", null, { timeout: 2500 });
    expect(Date.now() - t0).toBeLessThan(2500);
    // the peeked page's stylesheet came along
    expect(await page.$$eval('link[href="/assets/css/visualizers/marble.css"]', (l) => l.length)).toBe(1);
    await ctx.close();
  });
});
