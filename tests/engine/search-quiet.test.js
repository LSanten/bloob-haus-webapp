/**
 * The quiet search (bloob-haus-26): Pagefind still finds everything (full text, headings inside a
 * page, tags, IDs); results are drawn as a quiet list grouped by kind, each with its object in
 * miniature and a peek eye. Runs against a stand-in /pagefind/pagefind.js. Skips without Chromium.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
let browser = null, searchJs = "", css = "";
beforeAll(async () => {
  try { browser = await (await import("@playwright/test")).chromium.launch(); } catch { browser = null; }
  searchJs = fs.readFileSync(path.join(ROOT, "lib/visualizers/search/browser.js"), "utf-8");
  css = fs.readFileSync(path.join(ROOT, "lib/visualizers/search/styles.css"), "utf-8");
});
afterAll(async () => browser?.close());

const FAKE = `
const pages = [
  { url: "/marbles/yamas/", meta: { title: "The ethics of Yoga", subtitle: "The Yamas and Niyamas", kind: "marble", picture: "/og/marble/marbles--yamas-256.png" }, excerpt: "for you. The ethics of <mark>Yoga</mark>. ID: yamas YAMAS AND NIYAMAS more words", sub_results: [{ title: "Ahimsa", url: "/marbles/yamas/#ahimsa", excerpt: "non-harm in <mark>yoga</mark>" }], filters: { tag: ["yoga"] } },
  { url: "/marbles/flows/", meta: { title: "Yoga flows I want to do", kind: "note" }, excerpt: "A list of <mark>yoga</mark> flows", sub_results: [], filters: { tag: ["yoga", "lists"] } },
  { url: "/", meta: { title: "Index", kind: "page" }, excerpt: "my <mark>yoga</mark> corner", sub_results: [], filters: { tag: [] } },
  { url: "/marbles/hatha/", meta: { title: "Hatha Yoga Postures", kind: "marble", picture: "/og/marble/marbles--hatha-256.png" }, excerpt: "<mark>Yoga</mark> postures", sub_results: [], filters: { tag: ["yoga"] } },
];
export async function init() {}
export async function preload() {}
export async function filters() { return { tag: { yoga: 3, lists: 1, "living-systems": 2 } }; }
export async function search(q, opts = {}) {
  let r = q ? pages.filter((p) => (p.meta.title + p.excerpt).toLowerCase().includes(q.toLowerCase())) : [];
  const want = opts.filters?.tag?.any || [];
  if (want.length) r = r.filter((p) => p.filters.tag.some((t) => want.includes(t)));
  return { results: r.map((p) => ({ id: p.url, data: async () => p })) };
}`;

const page = (settings = '{"placeholder":"Look through my Bloob Haus...","show_tags":true}') => `<!doctype html><html class="bh-js" data-search-style="quiet"><head><style>${css}</style></head><body>
<script type="application/json" id="bloob-shape-about">{"marble":"A glass marble you open.","note":"A note on paper."}</script>
<div class="search-visualizer" data-search-settings='${settings}'></div>
<script>${searchJs}</script></body></html>`;

async function open(settings) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await ctx.route("https://test.local/**", (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === "/pagefind/pagefind.js") return r.fulfill({ contentType: "text/javascript", body: FAKE });
    if (u.endsWith(".png")) return r.fulfill({ status: 404, body: "" });
    return r.fulfill({ contentType: "text/html", body: u === "/" ? page(settings) : "<p>arrived</p>" });
  });
  const p = await ctx.newPage();
  await p.goto("https://test.local/");
  return { ctx, p };
}
const search = async (p, q) => { await p.fill(".sq-input", q); await p.waitForTimeout(400); };

describe("quiet search", () => {
  it("draws its own field with the placeholder, not Pagefind's default UI", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    expect(await p.getAttribute(".sq-input", "placeholder")).toBe("Look through my Bloob Haus...");
    expect(await p.$$eval(".pagefind-ui", (e) => e.length)).toBe(0);
    await ctx.close();
  });

  it("keeps the search's own ranking: what fits best comes first, whatever its kind", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    expect(await p.$$eval(".sq-group", (e) => e.length)).toBe(0);
    expect(await p.$$eval(".sq-item:not(.sq-item--tag) .sq-title", (e) => e.map((t) => t.textContent))).toEqual(["The ethics of Yoga", "Yoga flows I want to do", "Index", "Hatha Yoga Postures"]);
    await ctx.close();
  });

  it("each result says what it is; a click on its kind tells what that kind of object is", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    expect(await p.$$eval(".sq-item:not(.sq-item--tag) .sq-kind", (e) => e.map((k) => k.textContent.trim()))).toEqual(["Marble", "Note", "Page", "Marble"]);
    // the kind's name sits under the result's object
    const pos = await p.$eval(".sq-item:not(.sq-item--tag)", (e) => { const t = e.querySelector(".sq-thumb").getBoundingClientRect(), k = e.querySelector(".sq-kind").getBoundingClientRect(); return { below: k.top >= t.bottom - 1, centred: Math.abs((k.left + k.right) / 2 - (t.left + t.right) / 2) < 6 }; });
    expect(pos).toEqual({ below: true, centred: true });
    await p.click(".sq-item:not(.sq-item--tag) >> nth=1 >> .sq-kind");
    expect(await p.$eval(".sq-item:not(.sq-item--tag) >> nth=1 >> .sq-about", (e) => e.textContent)).toContain("A note on paper.");
    await ctx.close();
  });

  it("every result has a peek eye, its words lit, and a clean excerpt without ID blocks", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    expect(await p.$$eval(".sq-item:not(.sq-item--tag)", (e) => e.length)).toBe(4);
    expect(await p.$$eval(".sq-item:not(.sq-item--tag) .bloob-peek-eye", (e) => e.length)).toBe(4);
    const first = await p.$eval(".sq-item:not(.sq-item--tag)", (e) => e.innerText);
    expect(first).toContain("The Yamas and Niyamas");
    expect(first).not.toMatch(/^\s*for you/m);
    expect(first).not.toContain("YAMAS AND NIYAMAS");
    expect(first).toContain("more words");
    expect(await p.$$eval(".sq-item mark", (e) => e.length)).toBeGreaterThan(0);
    expect(await p.$$eval(".sq-item .sv-id-pill", (e) => e.length)).toBe(0); // the link is there now
    expect(first).not.toContain("ID:");
    await ctx.close();
  });

  it("headings inside a page come along as direct links", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    expect(await p.$eval(".sq-sub a", (a) => a.getAttribute("href"))).toBe("/marbles/yamas/#ahimsa");
    await ctx.close();
  });

  it("tag chips narrow the results", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    await p.click('.sq-chips button[data-tag="lists"]');
    await p.waitForTimeout(300);
    expect(await p.$$eval(".sq-item:not(.sq-item--tag)", (e) => e.length)).toBe(1);
    await ctx.close();
  });

  it("a tag that fits is a result of its own, first when its name is what you typed", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    const first = await p.$eval(".sq-item", (e) => ({ tag: e.classList.contains("sq-item--tag"), href: e.querySelector(".sq-link").getAttribute("href"), text: e.innerText }));
    expect(first.tag).toBe(true);
    expect(first.href).toBe("/tags/yoga/");
    expect(first.text).toContain("#yoga");
    expect(first.text).toContain("3 pages");
    await search(p, "list");
    expect(await p.$$eval(".sq-item--tag .sq-link", (e) => e.map((a) => a.getAttribute("href")))).toEqual(["/tags/lists/"]);
    await ctx.close();
  });

  it("a hyphen in a tag reads as a space", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "living systems");
    expect(await p.$$eval(".sq-item--tag .sq-link", (e) => e.map((a) => a.getAttribute("href")))).toEqual(["/tags/living-systems/"]);
    await ctx.close();
  });

  it("a haus can turn tag results off in the search block (show_tag_results: false)", async () => {
    if (!browser) return;
    const { ctx, p } = await open('{"placeholder":"Search","show_tag_results":false}');
    await search(p, "yoga");
    expect(await p.$$eval(".sq-item--tag", (e) => e.length)).toBe(0);
    expect(await p.$$eval(".sq-item", (e) => e.length)).toBe(4);
    await ctx.close();
  });

  it("Enter opens the first result", async () => {
    if (!browser) return;
    const { ctx, p } = await open();
    await search(p, "yoga");
    await Promise.all([p.waitForURL("https://test.local/tags/yoga/"), p.press(".sq-input", "Enter")]);
    await ctx.close();
  });
});
