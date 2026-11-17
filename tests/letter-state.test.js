/**
 * A letter that starts shut on a haus (`state: sealed | opened`, Leon 2026-11-16): the page's HTML
 * is the whole letter, the letter's browser.js folds it on load, the reader tears or opens it, and
 * this browser remembers. Checked in a real browser, with the script bundled as the site ships it.
 * Skips cleanly when no chromium is available.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderNote } from "../lib/visualizers/letter/index.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(ROOT, "lib/visualizers/letter/styles.css"), "utf-8");
const BODY = "The lake was still.\nI keep thinking about it.";
const letter = (state) => renderNote({ data: { to: "Whitney", from: "Leon", timing: "no-rush", state }, body: BODY });

let browser = null;
let script = "";
beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
    const out = await esbuild.build({ entryPoints: [path.join(ROOT, "lib/visualizers/letter/browser.js")], bundle: true, format: "iife", write: false, logLevel: "silent" });
    script = out.outputFiles[0].text;
  } catch {
    browser = null;
  }
});
afterAll(async () => { await browser?.close(); });

/** A page at a real address (so it has storage), the letter in it, the script at the end of the body. */
async function open(state, { js = true, reducedMotion = "reduce", context, breakStorage = false, url = "http://haus.test/letters/one/" } = {}) {
  const ctx = context || (await browser.newContext({ javaScriptEnabled: js, reducedMotion }));
  const page = await ctx.newPage();
  if (breakStorage) await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("no storage"); } }));
  await page.route("http://haus.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${letter(state)}<script>${script}</script></body>` }));
  await page.goto(url);
  return page;
}
const look = (page) => page.evaluate(() => {
  const el = document.querySelector(".bh-letter"), paper = el.querySelector(".bh-paper"), act = el.querySelector(".bh-letter__act"), button = el.querySelector(".bh-letter__open");
  const seen = (n) => !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== "hidden";
  return {
    paper: seen(paper), button: seen(button), label: button?.getAttribute("aria-label"), text: button?.innerText,
    opacity: getComputedStyle(el).opacity, classes: el.className, envelope: el.querySelector(".bh-env")?.className, tears: el.querySelector(".bh-env")?.dataset.tears,
    peek: seen(el.querySelector(".bh-env__peek")), teaser: el.querySelector(".bh-env__peek")?.innerText ?? "", status: el.querySelector(".bh-env__status")?.innerText,
    focus: document.activeElement === paper, act: act ? act.hidden : null,
  };
});

describe("a letter that starts shut, in a browser", () => {
  it("without script the whole letter is there, unfolded, and no button shows", async (ctx) => {
    if (!browser) return ctx.skip();
    for (const state of ["sealed", "opened"]) {
      const page = await open(state, { js: false });
      const l = await look(page);
      expect(l).toMatchObject({ paper: true, button: false, opacity: "1" });
      expect(await page.locator(".bh-paper").innerText()).toContain("The lake was still.");
      await page.context().close();
    }
  });

  it("sealed: folded on load, torn open in three presses of a real button, then the paper is out", async (ctx) => {
    if (!browser) return ctx.skip();
    const page = await open("sealed");
    let l = await look(page);
    expect(l).toMatchObject({ paper: false, button: true, label: "Tear open, 0 of 3", tears: "0", peek: false, opacity: "1", status: "A letter, sealed, not opened yet." });
    expect(l.text).toContain("Tear open");
    expect(l.classes).toContain("is-assembled");

    await page.locator(".bh-letter__open").focus();
    await page.keyboard.press("Enter");   // the keyboard tears too
    l = await look(page);
    expect(l).toMatchObject({ paper: false, label: "Tear open, 1 of 3", tears: "1", status: "A letter, tearing open." });
    expect(l.text).toContain("●○○");
    await page.keyboard.press("Space");
    expect(await look(page)).toMatchObject({ paper: false, label: "Tear open, 2 of 3", tears: "2" });
    await page.locator(".bh-letter__open").click();
    await page.waitForFunction(() => document.querySelector(".bh-letter").classList.contains("is-out"));
    l = await look(page);
    expect(l).toMatchObject({ paper: true, button: false, tears: "3", focus: true, peek: false });
    expect(await page.evaluate(() => localStorage.getItem("bh-letter-opened:/letters/one/"))).toBe("1");
    await page.context().close();
  });

  it("opened: the envelope is torn with the paper's first words sticking out; one press takes it out", async (ctx) => {
    if (!browser) return ctx.skip();
    const page = await open("opened");
    let l = await look(page);
    expect(l).toMatchObject({ paper: false, button: true, text: "Open", peek: true, tears: "3" });
    expect(l.envelope).toContain("envelope-opened");
    expect(l.teaser).toContain("The lake was still.");
    await page.locator(".bh-letter__outside").click();   // a tap on the envelope counts too
    await page.waitForFunction(() => document.querySelector(".bh-letter").classList.contains("is-out"));
    expect(await look(page)).toMatchObject({ paper: true, button: false, peek: false });
    await page.context().close();
  });

  it("unfolded, or no state: the script leaves the letter alone", async (ctx) => {
    if (!browser) return ctx.skip();
    const page = await open(undefined);
    expect(await look(page)).toMatchObject({ paper: true, button: false, opacity: "1", status: "A letter. Its envelope, and below it the paper inside." });
    await page.context().close();
  });

  it("this browser remembers: opened once, it is unfolded on the next visit; another letter, and another browser, start shut", async (ctx) => {
    if (!browser) return ctx.skip();
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const first = await open("opened", { context });
    await first.locator(".bh-letter__open").click();
    await first.close();
    const again = await open("opened", { context });
    expect(await look(again)).toMatchObject({ paper: true, button: false, opacity: "1", status: "A letter. Its envelope, and below it the paper inside." });
    const other = await open("opened", { context, url: "http://haus.test/letters/two/" });
    expect(await look(other)).toMatchObject({ paper: false, button: true });
    await context.close();
    const stranger = await open("opened");
    expect(await look(stranger)).toMatchObject({ paper: false, button: true });
    await stranger.context().close();
  });

  it("when storage throws, the letter still folds and opens; it is just not remembered", async (ctx) => {
    if (!browser) return ctx.skip();
    const page = await open("sealed", { breakStorage: true });
    expect(await look(page)).toMatchObject({ paper: false, button: true });
    for (let i = 0; i < 3; i++) await page.locator(".bh-letter__open").click();
    await page.waitForFunction(() => document.querySelector(".bh-letter").classList.contains("is-out"));
    expect(await look(page)).toMatchObject({ paper: true, button: false });
    await page.context().close();
  });

  it("appears whole: until it is folded the letter is not seen, so it never shows unfolded and snaps shut", async (ctx) => {
    if (!browser) return ctx.skip();
    const context = await browser.newContext();
    const page = await context.newPage();
    // the same page, but its script never arrives
    await page.route("http://haus.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><meta charset="utf-8"><style>${css}</style><body>${letter("sealed")}</body>` }));
    await page.goto("http://haus.test/letters/slow/");
    const l = await look(page);
    expect(l.classes).toContain("bh-letter--js");
    expect(l.classes).not.toContain("is-assembled");
    expect(Number(l.opacity)).toBeLessThan(0.1);
    // and if the script never comes, it shows after 3s anyway, unfolded
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".bh-letter")).opacity === "1", null, { timeout: 6000 });
    expect(await look(page)).toMatchObject({ paper: true });
    await context.close();
  });

  it("with motion allowed, the paper is taken out and the sheet unfolds; the end is the same", async (ctx) => {
    if (!browser) return ctx.skip();
    const page = await open("opened", { reducedMotion: "no-preference" });
    await page.locator(".bh-letter__open").click();
    expect(await page.evaluate(() => document.querySelector(".bh-letter").hasAttribute("data-bh-taking"))).toBe(true);
    await page.waitForFunction(() => document.querySelector(".bh-letter").classList.contains("is-out"), null, { timeout: 5000 });
    expect(await look(page)).toMatchObject({ paper: true, button: false, peek: false });
    await page.context().close();
  });
});
