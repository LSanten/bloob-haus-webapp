/**
 * Marbles in a room float a little and can be dragged around for fun; a drag never opens the
 * marble, a plain click still does. Skips when Chromium is not installed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderRoom } from "../../lib/visualizers/_engine/room.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, toolbox = "", css = "";
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  toolbox = (await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false })).outputFiles[0].text;
  css = ["lib/visualizers/_engine/engine.css", "themes/bloob-haus-26/assets/css/main.css"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf-8")).join("\n");
});
afterAll(async () => browser?.close());

const room = () => renderRoom([
  { id: "/m/a/", type: "page", title: "A", shape: "marble", color: "#3366aa" },
  { id: "/m/b/", type: "page", title: "B", shape: "marble", color: "#aa6633" },
], new Set(["marble"]));
const page = () => `<!doctype html><html class="bh-js"><head><style>${css}</style></head><body><main>${room()}</main><script>${toolbox}</script></body></html>`;

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  await ctx.route("https://test.local/**", (r) => r.fulfill({ contentType: "text/html", body: new URL(r.request().url()).pathname === "/" ? page() : "<p>arrived</p>" }));
  const p = await ctx.newPage();
  await p.goto("https://test.local/");
  return { ctx, p };
}
const center = (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });

describe("room play", () => {
  it("marbles float", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await p.waitForFunction(() => document.querySelector(".room-object--marble")?.classList.contains("is-floating"), null, { timeout: 5000 });
    expect(await p.$eval(".room-object--marble .room-object__ball", (e) => getComputedStyle(e).animationName)).not.toBe("none");
    await ctx.close();
  });

  it("a drag moves a marble and does not open it", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    const [x, y] = await center(p, ".room-object--marble");
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 120, y + 60, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(200);
    expect(p.url()).toBe("https://test.local/");
    const [x2] = await center(p, ".room-object--marble");
    expect(x2).toBeGreaterThan(x + 80);
    await ctx.close();
  });

  it("a plain click still goes to the marble", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await Promise.all([p.waitForURL("https://test.local/m/a/"), p.click(".room-object--marble")]);
    await ctx.close();
  });

  it("an interrupted drag ends: the marble stops following, and the next click still works", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    const [x, y] = await center(p, ".room-object--marble");
    await p.evaluate(([x, y]) => {
      const m = document.querySelector(".room-object--marble");
      const ev = (type, cx, cy, extra = {}) => new PointerEvent(type, { bubbles: true, clientX: cx, clientY: cy, pointerType: "mouse", button: 0, buttons: 1, ...extra });
      m.dispatchEvent(ev("pointerdown", x, y));
      window.dispatchEvent(ev("pointermove", x + 80, y));
      window.dispatchEvent(ev("pointercancel", x + 80, y));
      window.dispatchEvent(ev("pointermove", x + 300, y + 200, { buttons: 0 }));
    }, [x, y]);
    const [x2] = await center(p, ".room-object--marble");
    expect(x2).toBeLessThan(x + 150);
    await Promise.all([p.waitForURL("https://test.local/m/b/"), p.click(".room-object--marble >> nth=1")]);
    await ctx.close();
  });

  it("only marbles on screen float, and none while peeking", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await p.waitForTimeout(200);
    expect(await p.$eval(".room-object--marble", (e) => e.classList.contains("is-floating"))).toBe(true);
    await p.evaluate(() => document.documentElement.classList.add("bh-peeking"));
    expect(await p.$eval(".room-object--marble .room-object__ball", (e) => getComputedStyle(e).animationPlayState)).toBe("paused");
    await ctx.close();
  });

  it("the glare moves as a marble is dragged: it stays toward the light at the top right", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    const before = await p.$eval(".room-object--marble", (e) => [e.style.getPropertyValue("--sx"), e.style.getPropertyValue("--sy")]);
    const [x, y] = await center(p, ".room-object--marble");
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x - 200, y + 250, { steps: 10 }); await p.mouse.up();
    await p.waitForTimeout(100);
    const after = await p.$eval(".room-object--marble", (e) => [e.style.getPropertyValue("--sx"), e.style.getPropertyValue("--sy")]);
    expect(before[0]).not.toBe("");
    expect(after).not.toEqual(before);
    await ctx.close();
  });
});
