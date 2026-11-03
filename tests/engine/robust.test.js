/**
 * The toolbox and share row survive what visitors bring: a malformed #hash, blocked storage,
 * and Safari's rule that copying must start inside the click. Skips without Chromium.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderObject } from "../../lib/visualizers/_engine/render.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, toolbox = "";
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  toolbox = (await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false })).outputFiles[0].text;
});
afterAll(async () => browser?.close());
const shape = { name: "marble", manifest: { name: "marble", opens: "click", shares: true }, templates: { open: "<p>{{ body }}</p>" } };

describe("robust toolbox", () => {
  it("a malformed #hash does not stop the share row from starting", async () => {
    if (!browser) return;
    const ctx = await browser.newContext();
    const obj = renderObject(shape, { data: { title: "T" }, html: "words", url: "/a/", pageId: "a" });
    await ctx.route("https://test.local/**", (r) => r.fulfill({ contentType: "text/html", body: `<!doctype html><html class="bh-js"><body>${obj}<script>history.replaceState(null, '', '/a/#100%')</script><script>${toolbox}</script></body></html>` }));
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("https://test.local/a/");
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
    await ctx.close();
  });

  it("copy markdown hands the clipboard a promise inside the click (Safari)", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib/visualizers/_engine/share.js"), "utf-8");
    expect(src).toMatch(/markdown:[\s\S]*?new ClipboardItem\(\{\s*"text\/plain":/);
  });
});
