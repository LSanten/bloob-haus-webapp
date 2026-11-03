/**
 * The browser toolbox in a real browser: a click opens an object and drives --open to 1, a
 * remembered object comes back open, and an arrival from a click inside the site plays the
 * opening. Like the other browser tests here, it skips when Chromium is not installed (CI).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import { headInitScript } from "../../lib/visualizers/_engine/head-init.js";
import { renderObject } from "../../lib/visualizers/_engine/render.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null;
let toolbox = "";
let engineCss = "";

const shape = {
  name: "note",
  manifest: { name: "note", opens: "click", remembers: "visitor" },
  templates: { open: '<div class="paper"><button data-bloob-toggle>roll</button>{{ body }}</div>' },
};

function pageHtml(pageId) {
  const obj = renderObject(shape, { data: { title: "T" }, html: "<p>words</p>", url: "/a/", pageId });
  return `<!doctype html><html><head><meta name="bloob-page-id" content="${pageId}">${headInitScript({ pageId })}
<style>${engineCss}</style></head><body>${obj}<a id="link" href="/b/">to b</a><script>${toolbox}</script></body></html>`;
}

beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null;
  }
  const out = await build({ entryPoints: [path.join(ROOT, "lib/visualizers/_engine/toolbox.js")], bundle: true, format: "iife", write: false });
  toolbox = out.outputFiles[0].text;
  engineCss = (await import("fs")).readFileSync(path.join(ROOT, "lib/visualizers/_engine/engine.css"), "utf-8");
});
afterAll(async () => browser?.close());

async function openPage() {
  const context = await browser.newContext();
  await context.route("https://test.local/**", (route) =>
    route.fulfill({ contentType: "text/html", body: pageHtml(new URL(route.request().url()).pathname.replace(/\//g, "") || "home") }));
  const page = await context.newPage();
  return { context, page };
}
const openValue = (page) => page.$eval(".bloob-object", (el) => parseFloat(getComputedStyle(el).getPropertyValue("--open")));

const longShape = {
  name: "scroll",
  manifest: { name: "scroll", opens: "click", pace: "length" },
  templates: {
    open: '<div class="paper" data-bloob-measure style="overflow:hidden;max-height:calc(100px + var(--open) * (var(--full-height, 100000px) - 100px))">{{ body }}</div><button data-bloob-toggle>roll</button>',
  },
};

describe("toolbox in a browser", () => {
  it("an outside arrival starts closed and a click opens it", async () => {
    if (!browser) return;
    const { context, page } = await openPage();
    await page.goto("https://test.local/a/");
    expect(await openValue(page)).toBe(0);
    await page.click("[data-bloob-toggle]");
    await page.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open");
    expect(await openValue(page)).toBe(1);
    await context.close();
  });

  it("a remembered note comes back open after a reload", async () => {
    if (!browser) return;
    const { context, page } = await openPage();
    await page.goto("https://test.local/a/");
    await page.click("[data-bloob-toggle]");
    await page.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open");
    await page.reload();
    expect(await openValue(page)).toBe(1);
    await context.close();
  });

  it("clicking a link inside the site makes the next page play its opening", async () => {
    if (!browser) return;
    const { context, page } = await openPage();
    await page.goto("https://test.local/a/");
    // Record every state the object passes through on the next page.
    await context.addInitScript(() => {
      window.__states = [];
      new MutationObserver(() => {
        const el = document.querySelector(".bloob-object");
        if (el && window.__states.at(-1) !== el.dataset.state) window.__states.push(el.dataset.state);
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-state"] });
    });
    await page.click("#link");
    await page.waitForURL("https://test.local/b/");
    await page.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open");
    const states = await page.evaluate(() => window.__states);
    expect(states).toContain("opening");
    expect(states.at(-1)).toBe("open");
    await context.close();
  });

  it("an unrolled paper reaches its full height", async () => {
    if (!browser) return;
    const context = await browser.newContext();
    const body = Array.from({ length: 40 }, (_, i) => `<p>line ${i}</p>`).join("");
    const obj = renderObject(longShape, { data: {}, html: body, url: "/s/", pageId: "s" });
    await context.route("https://test.local/**", (route) => route.fulfill({ contentType: "text/html",
      body: `<!doctype html><html><head><meta name="bloob-page-id" content="s">${headInitScript({ pageId: "s" })}<style>${engineCss}</style></head><body>${obj}<script>${toolbox}</script></body></html>` }));
    const page = await context.newPage();
    await page.goto("https://test.local/s/");
    await page.click("[data-bloob-toggle]");
    await page.waitForFunction(() => document.querySelector(".bloob-object").dataset.state === "open");
    const [shown, full] = await page.$eval(".paper", (el) => [el.clientHeight, el.scrollHeight]);
    expect(shown).toBeGreaterThanOrEqual(full - 1);
    expect(shown).toBeGreaterThan(400);
    await context.close();
  });
});
