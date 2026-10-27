/**
 * Internal links read as plain inline links in every theme (2026-10-26):
 * same box as an ordinary link, line height unchanged, hover moves nothing,
 * and internal-links.js adds no icon unless the site asks (data-link-icons).
 * Real browser, real stylesheets; self-skips without chromium.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");
const THEMES = ["marbles-pouch", "melt", "alter-engineers", "warm-kitchen"];
const PARAGRAPH = `<p id="p">Some words before <a id="plain" href="https://example.org/">a plain link</a> then
  <a id="internal" class="internal-link" href="/marbles/x/">an internal link</a> and more words.</p>`;

let browser = null;
beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null;
  }
}, 60_000);
afterAll(async () => browser && browser.close());

const measure = () => {
  const r = (id) => document.getElementById(id).getBoundingClientRect();
  return { top: r("internal").top, h: r("internal").height, plainTop: r("plain").top, plainH: r("plain").height, pH: r("p").height };
};

describe("internal links sit in the line like any other link", () => {
  for (const theme of THEMES) {
    it(`${theme}: same box as a plain link, hover moves nothing`, async () => {
      if (!browser) return;
      const page = await browser.newPage();
      try {
        const css = [read("themes/_base/assets/css/base.css"), read(`themes/${theme}/assets/css/main.css`)];
        await page.setContent(`${css.map((c) => `<style>${c}</style>`).join("")}<main><article>${PARAGRAPH}</article></main>`);
        const a = await page.evaluate(measure);
        expect(a.top).toBeCloseTo(a.plainTop, 1);
        expect(a.h).toBeCloseTo(a.plainH, 1);
        await page.hover("#internal");
        await page.waitForTimeout(250);
        const b = await page.evaluate(measure);
        expect(b.top).toBeCloseTo(a.top, 1);
        expect(b.pH).toBeCloseTo(a.pH, 1);
        const bg = await page.evaluate(() => getComputedStyle(document.getElementById("internal")).backgroundColor);
        expect(bg).not.toBe("rgba(0, 0, 0, 0)");
      } finally {
        await page.close();
      }
    });
  }

  it("a component that is also an internal link keeps its own padding", async () => {
    if (!browser) return;
    const page = await browser.newPage();
    try {
      await page.setContent(`<style>${read("themes/_base/assets/css/base.css")}</style><style>.badge{display:inline-block;padding:4px 12px;border-radius:20px}</style><p><a id="b" class="badge internal-link" href="/x/">t</a></p>`);
      const r = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById("b")); return [cs.padding, cs.borderRadius]; });
      expect(r).toEqual(["4px 12px", "20px"]);
    } finally {
      await page.close();
    }
  });
});

describe("internal-links.js: icons are opt-in", () => {
  const script = read("themes/_base/assets/js/internal-links.js");
  const graph = JSON.stringify({ nodes: [{ id: "/marbles/x/", title: "X", bloobIcon: "/icon.png" }] });
  async function run(attrs, body) {
    const page = await browser.newPage();
    await page.route("**/graph.json", (r) => r.fulfill({ contentType: "application/json", body: graph }));
    await page.route("**/page", (r) => r.fulfill({ contentType: "text/html", body: `<article>${body}</article><script ${attrs}>${script}</script>` }));
    await page.goto("http://bloob.test/page");
    await page.waitForFunction(() => document.querySelector("a.internal-link"));
    const out = await page.evaluate(() => [...document.querySelectorAll("a")].map((a) => [a.className, !!a.querySelector(".internal-link__icon")]));
    await page.close();
    return out;
  }
  const P = `<p><a href="/marbles/x/">x</a></p>`;

  it("no icon by default; classed links (tag badges) and data-no-pills left alone", async () => {
    if (!browser) return;
    const out = await run("", `${P}<ul><li><a class="tag-badge" href="/marbles/x/">t</a></li></ul><div data-no-pills>${P}</div>`);
    expect(out).toEqual([["internal-link", false], ["tag-badge", false], ["", false]]);
  });

  it("icons come back with data-link-icons on the script or a container", async () => {
    if (!browser) return;
    expect((await run("data-link-icons", P))[0][1]).toBe(true);
    expect((await run("", `${P}<div data-link-icons>${P}</div>`)).map((l) => l[1])).toEqual([false, true]);
  });
});
