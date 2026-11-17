/**
 * The paper in a torn-open envelope is folded like a real letter (Leon, 2026-11-16): as long as
 * the letter is, never longer than the envelope it has to fit in, and a short letter stays short.
 * Its words are a small copy of the open sheet's top, and only on the part that sticks out: inside
 * the envelope the paper is blank, so nothing crosses the envelope's own words.
 *
 * Measured in a real browser, because this is layout (cqi, max-height, a flex child that shrinks)
 * and cannot be read off the stylesheet. Skips cleanly when no chromium is available.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderClosed, renderBack } from "../lib/visualizers/letter/renderer.js";
import { renderPaper, renderPaperBody } from "../lib/visualizers/letter/paper.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(ROOT, "lib/visualizers/letter/styles.css"), "utf-8");
const env = { to: "Whitney", from: "Leon", date_created: "2026-11-15", opened: "2026-11-16" };
const LONG = "The lake was still.\n\n" + "A paragraph that goes on for a while, so the paper is long. ".repeat(40);
const SHORT = "Thank you.";

let browser = null;
beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null;
  }
});
afterAll(async () => { await browser?.close(); });

async function measure(markdown, width) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const inside = { html: renderPaperBody(markdown) };
  await page.setContent(`<style>${css} body{margin:80px 20px} .slot{width:${width}px;position:relative;margin-bottom:120px} #hint{margin-top:120px} .open{width:640px}</style>` +
    // a host lays the back over the front, so it has the front's size (as the post office's turning letter does)
    `<div class="slot"><div id="front">${renderClosed(env, inside)}</div><div id="back" style="position:absolute;inset:0">${renderBack(env, undefined, inside)}</div></div>` +
    `<div class="slot" id="hint">${renderClosed(env, { lines: 400 })}</div>` +
    `<div class="open">${renderPaper(env, markdown)}</div>`);
  const out = await page.evaluate(() => {
    const box = (root, sel) => document.querySelector(`${root} ${sel}`).getBoundingClientRect();
    const of = (root) => {
      const fig = box(root, ".bh-env"), peek = box(root, ".bh-env__peek");
      const who = document.querySelector(`${root} .words-who`)?.getBoundingClientRect();
      return { envH: fig.height, above: fig.top - peek.top, below: fig.bottom - peek.bottom, peekH: peek.height, peekW: peek.width,
        clearOfWho: who ? who.top - peek.bottom : null };
    };
    const size = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
    return {
      front: of("#front"), back: of("#back"), hint: of("#hint"),
      smallType: size("#front .bh-env__sheet .bh-paper__body"), openType: size(".open .bh-paper__body"),
      backWords: getComputedStyle(document.querySelector("#back .bh-env__sheet")).visibility,
      envW: box("#front", ".bh-env").width,
      mask: ((cs) => cs.maskImage || cs.webkitMaskImage || "")(getComputedStyle(document.querySelector("#front .bh-env__sheet"))),
    };
  });
  await page.close();
  return out;
}

describe("the paper in a torn-open envelope, in a browser", () => {
  it("a long letter is folded to fit: its paper ends inside the envelope, just above the to and from line (2026-11-17)", async (ctx) => {
    if (!browser) return ctx.skip();
    for (const width of [380, 240]) {
      const m = await measure(LONG, width);
      expect(m.front.clearOfWho).toBeGreaterThan(0);   // never behind to and from (feedback a96520aa)
      expect(m.front.clearOfWho).toBeLessThan(m.front.envH * 0.08);   // and not far above it either
      expect(m.hint.clearOfWho).toBeGreaterThan(0);
      expect(m.front.above).toBeGreaterThan(0);   // and it still sticks out of the torn top
      expect(m.hint.below).toBeGreaterThan(0);   // a blank paper of known length is folded the same way
    }
  });

  it("a short letter keeps its own short paper", async (ctx) => {
    if (!browser) return ctx.skip();
    const short = await measure(SHORT, 380), long = await measure(LONG, 380);
    expect(short.front.peekH).toBeLessThan(long.front.peekH * 0.5);
    expect(short.front.below).toBeGreaterThan(short.front.envH * 0.5);
  });

  it("its words are the open sheet's, at the scale of the small paper", async (ctx) => {
    if (!browser) return ctx.skip();
    const m = await measure(LONG, 380);
    expect(m.smallType / m.front.peekW).toBeCloseTo(m.openType / 640, 3);
  });

  it("the words stop above the torn edge: inside the envelope the paper is blank", async (ctx) => {
    if (!browser) return ctx.skip();
    for (const width of [380, 240]) {
      const m = await measure(LONG, width);
      // down the paper, where the last word has faded (the browser keeps the gradient's stops in cqi)
      expect(m.mask).toContain("linear-gradient");
      const [, n, unit] = /([\d.]+)(px|cqi)\)$/.exec(m.mask);   // the last stop, as the browser reports it
      const wordsEnd = unit === "px" ? Number(n) : Number(n) * m.envW / 100;
      const intoEnvelope = (wordsEnd - m.front.above) / m.envW * 100;   // in cqi below the envelope's top
      expect(intoEnvelope).toBeGreaterThan(0);
      expect(intoEnvelope).toBeLessThan(4.4);   // the torn edge is never higher than this
      expect(m.front.peekH).toBeGreaterThan(wordsEnd * 2);   // and the paper itself goes on, blank, to its fold
    }
  });

  it("the back's paper is exactly as long as the front's, blank", async (ctx) => {
    if (!browser) return ctx.skip();
    const m = await measure(LONG, 380);
    expect(m.back.peekH).toBeCloseTo(m.front.peekH, 0);
    expect(m.backWords).toBe("hidden");
  });
});
