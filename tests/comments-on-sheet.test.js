/**
 * Comments sit on the sheet, by day and by night (Leon's feedback d0ed84d9, d598fddf).
 * FastComments marks its iframe `color-scheme: normal !important`; on a page whose scheme is dark
 * (night, or a dark system with the page set to day) the browser then paints an opaque white
 * backdrop behind the frame. comments-on-sheet.js tells the browser the frame is light (so the
 * backdrop stays clear) and keeps FastComments' documented hasDarkBackground option in step with
 * day and night through its documented instance.update(). Skips when Chromium is not installed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let browser = null;
const script = fs.readFileSync(path.join(ROOT, "themes/_base/assets/js/comments-on-sheet.js"), "utf-8");
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
});
afterAll(async () => browser?.close());

// A stand-in for FastComments: its iframe, styled the way embed-v2 styles it, and its instance list.
const page = () => `<!doctype html><html><head><style>
  :root{color-scheme:light dark}
  .sheet{background:#fbf8f1}
  :root[data-sky="night"]{color-scheme:dark}
  :root[data-sky="night"] .sheet{background:#1f1d26}
</style></head><body><main><article class="sheet">
<section class="bloob-comments"><div id="fastcomments-widget"></div></section>
</article></main><script>
  window.__updates = [];
  function makeFrame() {
    var f = document.createElement("iframe");
    f.setAttribute("style", "width: 1px !important; min-width: 100% !important; border: none !important; color-scheme: normal !important;");
    document.getElementById("fastcomments-widget").replaceChildren(f);
  }
  makeFrame();
  window.fcUIInstances = [{ targetElement: document.getElementById("fastcomments-widget"), config: {}, instance: { update: function (c) { window.__updates.push(c); } } }];
  window.__makeFrame = makeFrame;
</script><script>${script}</script></body></html>`;

async function open() {
  const ctx = await browser.newContext({ colorScheme: "dark" });
  await ctx.route("https://test.local/**", (r) => r.fulfill({ contentType: "text/html", body: page() }));
  const p = await ctx.newPage();
  await p.goto("https://test.local/");
  return { ctx, p };
}
const frameScheme = (p) => p.$eval(".bloob-comments iframe", (f) => getComputedStyle(f).colorScheme);

describe("comments on the sheet", () => {
  it("tells the browser the comment frame is light, so no white backdrop is painted behind it", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    expect(await frameScheme(p)).toBe("light");
    await ctx.close();
  });

  it("does the same for a frame FastComments draws again later", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await p.evaluate(() => window.__makeFrame());
    await p.waitForFunction(() => getComputedStyle(document.querySelector(".bloob-comments iframe")).colorScheme === "light");
    await ctx.close();
  });

  it("switching to night and back tells FastComments the background is dark, then light", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    expect(await p.evaluate(() => window.__updates.length)).toBe(0); // its own first guess stands
    await p.evaluate(() => document.documentElement.setAttribute("data-sky", "night"));
    await p.waitForFunction(() => window.__updates.length === 1);
    await p.evaluate(() => document.documentElement.setAttribute("data-sky", "day"));
    await p.waitForFunction(() => window.__updates.length === 2);
    expect(await p.evaluate(() => window.__updates)).toEqual([{ hasDarkBackground: true }, { hasDarkBackground: false }]);
    await ctx.close();
  });

  it("a change that leaves the background as it was sends nothing", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await p.evaluate(() => document.documentElement.classList.add("is-near"));
    await p.waitForTimeout(150);
    expect(await p.evaluate(() => window.__updates.length)).toBe(0);
    await ctx.close();
  });
});
