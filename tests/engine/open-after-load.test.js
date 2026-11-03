/**
 * An object's opening never starts before its closed look (the marble's picture) has loaded:
 * the page unfolds from a marble you can see, also in a peek. Skips without Chromium.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, toolbox = "";
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  toolbox = (await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false })).outputFiles[0].text;
});
afterAll(async () => browser?.close());

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const page = () => `<!doctype html><html class="bh-js" data-bh-initial="closed"><head><style>.bloob-object__open{overflow:hidden;max-height:calc(var(--open)*300px)}</style></head><body>
<div class="bloob-object bloob-object--marble" data-shape="marble" data-opens="click" data-state="open" style="--open:1">
<div class="bloob-object__closed"><button data-bloob-toggle>ball</button><img data-bloob-picture src="/slow.png" width="10" height="10"></div>
<div class="bloob-object__open"><p>words</p></div></div><script>${toolbox}</script></body></html>`;

describe("opening waits for the closed look", () => {
  it("does not unfold until the marble's picture has loaded", async () => {
    if (!browser) return;
    const ctx = await browser.newContext();
    let release;
    const slow = new Promise((r) => (release = r));
    await ctx.route("https://test.local/**", async (r) => {
      if (r.request().url().endsWith("/slow.png")) { await slow; return r.fulfill({ contentType: "image/png", body: PNG }); }
      return r.fulfill({ contentType: "text/html", body: page() });
    });
    const p = await ctx.newPage();
    await p.goto("https://test.local/", { waitUntil: "domcontentloaded" });
    await p.click("[data-bloob-toggle]");
    await p.waitForTimeout(700);
    const before = await p.$eval(".bloob-object", (e) => parseFloat(getComputedStyle(e).getPropertyValue("--open")));
    expect(before).toBe(0);
    release();
    await p.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open", null, { timeout: 5000 });
    await ctx.close();
  });
});
