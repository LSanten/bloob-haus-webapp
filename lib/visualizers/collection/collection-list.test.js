/**
 * Collection: hand-written lists, `:::collection` blocks and post cards.
 *
 * Runs the real index.js transform against a graph.json + pagePreviews.json
 * written to a temp SRC_DIR, the same way collection-invariants.test.js does.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

import { splitCollectionBlock, parseItemText, parseLooseSettings } from "./parser.js";
import { resolveListItems, resolvePages, isExternalTarget } from "./resolve.js";
import {
  parseShow,
  formatCardDate,
  truncateExcerpt,
  parseColumns,
  renderPostCardHtml,
  renderCollectionInner,
  isSearchDisabled,
} from "./renderer.js";

const NODES = [
  { id: "/", title: "Home", section: "", type: "page" },
  {
    id: "/marbles/MMSMammalWeight-A/",
    title: "Visualizing the ratio of wild mammals to domesticated mammals",
    section: "marbles",
    type: "page",
    image: "/og/mammals-og.png",
  },
  { id: "/portfolio/LAMP-BUCKET-HAT/", title: "Sustainable bucket hat lamp", section: "portfolio", type: "page", image: "/og/lamp-og.png" },
  { id: "/marbles/MMSCO2InCars/", title: "CO2 levels in cars", section: "marbles", type: "page", bloobIcon: "/favicon.png" },
  { id: "/notes/my-page/", title: "Leon's page", section: "notes", type: "page" },
  { id: "/marbles/OLD/", title: "Old one", section: "marbles", type: "page", website_status: "archived" },
  { id: "/tags/air/", title: "#air", section: "tags", type: "tag" },
];

const PREVIEWS = {
  "/marbles/MMSMammalWeight-A/": {
    excerpt: "Humans and livestock now outweigh all wild mammals by a wide margin, and this graphic shows how that came to be over time.",
    date: "2024-08-23",
    tags: ["agriculture", "visual"],
  },
  "/marbles/MMSCO2InCars/": { excerpt: "My CO2 sensor in the car.", date: "2025-09-23" },
};

let transform;

beforeAll(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "collection-list-"));
  fs.writeFileSync(path.join(tmp, "graph.json"), JSON.stringify({ nodes: NODES, links: [] }));
  fs.mkdirSync(path.join(tmp, "_data"));
  fs.writeFileSync(path.join(tmp, "_data", "pagePreviews.json"), JSON.stringify(PREVIEWS));
  process.env.SRC_DIR = tmp;
  ({ transform } = await import("./index.js"));
});

const b64 = (s) => Buffer.from(s, "utf-8").toString("base64");
/** What markdownItContainer emits for a `:::collection` block. */
const section = (body, settings) =>
  `<section class="collection"${settings ? ` data-vis-settings='${JSON.stringify(settings)}'` : ""} data-vis-raw="${b64(body)}">\n<ul><li>rendered inner html, ignored</li></ul>\n</section>`;
const fence = (body) => `<pre><code class="language-collection">${body}</code></pre>`;
const hrefs = (html) => [...html.matchAll(/class="fp-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);

// ── parser ───────────────────────────────────────────────────────────────────

describe("parseItemText", () => {
  it.each([
    ["[[PAGE-NAME]]", { target: "PAGE-NAME", label: null }],
    ["[[PAGE-NAME|Label]]", { target: "PAGE-NAME", label: "Label" }],
    ["[[PAGE#Heading|Label]]", { target: "PAGE", label: "Label" }],
    ["[Title](marbles/PAGE.md)", { target: "marbles/PAGE.md", label: "Title" }],
    ["[Title](/marbles/PAGE/)", { target: "/marbles/PAGE/", label: "Title" }],
    ["[A site](https://example.org/x)", { target: "https://example.org/x", label: "A site" }],
    ["[spaced](<My Page.md>)", { target: "My Page.md", label: "spaced" }],
    ["https://example.org", { target: "https://example.org", label: null }],
    ['<span class="broken-link" data-target="secret">Secret</span>', { target: "", label: "Secret", broken: true }],
  ])("%s", (text, expected) => {
    expect(parseItemText(text)).toEqual(expected);
  });

  it("returns null for a list item that does not start with a link", () => {
    expect(parseItemText("building_type")).toBeNull();
    expect(parseItemText("see [[PAGE]]")).toBeNull();
  });
});

describe("splitCollectionBlock", () => {
  it("separates settings lines from link bullets, keeping order", () => {
    const { settingsText, items } = splitCollectionBlock(
      "display: cards\n- [[B]]\nshow: image, date\n* [A](a.md)\n+ https://x.org\n",
    );
    expect(settingsText).toBe("display: cards\nshow: image, date\n");
    expect(items.map((i) => i.target)).toEqual(["B", "a.md", "https://x.org"]);
  });

  it("keeps a YAML list of plain values on the settings side", () => {
    const { settingsText, items } = splitCollectionBlock("show_fields:\n  - building_type\n  - location");
    expect(items).toEqual([]);
    expect(settingsText).toContain("- building_type");
  });

  it("parseLooseSettings reads key: value lines and ignores prose", () => {
    expect(parseLooseSettings("display: cards\nsome prose here\ncolumns: '2'")).toEqual({ display: "cards", columns: "2" });
  });
});

// ── resolve ──────────────────────────────────────────────────────────────────

describe("resolveListItems", () => {
  it("keeps the authored order and resolves every link form", () => {
    const items = [
      { target: "/portfolio/LAMP-BUCKET-HAT/", label: "LAMP-BUCKET-HAT" },
      { target: "MMSMammalWeight-A", label: null },
      { target: "marbles/MMSCO2InCars.md", label: "Toxic CO2 levels in cars" },
      { target: "notes/My Page.md", label: null },
    ];
    expect(resolveListItems(NODES, items).map((n) => n.id)).toEqual([
      "/portfolio/LAMP-BUCKET-HAT/",
      "/marbles/MMSMammalWeight-A/",
      "/marbles/MMSCO2InCars/",
      "/notes/my-page/",
    ]);
  });

  it("matches internal URLs case-insensitively and by page title", () => {
    const out = resolveListItems(NODES, [{ target: "/marbles/mmsmammalweight-a" }, { target: "CO2 levels in cars" }]);
    expect(out.map((n) => n.id)).toEqual(["/marbles/MMSMammalWeight-A/", "/marbles/MMSCO2InCars/"]);
  });

  it("uses the page's own title by default, the link text with `titles: link`", () => {
    const items = [{ target: "MMSCO2InCars", label: "Toxic CO2 levels in cars" }];
    expect(resolveListItems(NODES, items)[0].title).toBe("CO2 levels in cars");
    expect(resolveListItems(NODES, items, { titles: "link" })[0].title).toBe("Toxic CO2 levels in cars");
  });

  it("drops broken, unknown and duplicate entries; keeps an explicitly listed archived page", () => {
    const out = resolveListItems(NODES, [
      { target: "", label: "Secret", broken: true },
      { target: "DOES-NOT-EXIST" },
      { target: "MMSMammalWeight-A" },
      { target: "/marbles/MMSMammalWeight-A/" },
      { target: "OLD" },
      { target: "air" }, // a tag node, not a page
    ]);
    expect(out.map((n) => n.id)).toEqual(["/marbles/MMSMammalWeight-A/", "/marbles/OLD/"]);
  });

  it("turns an external link into a title + link card", () => {
    const [ext] = resolveListItems(NODES, [{ target: "https://www.example.org/a", label: null }]);
    expect(ext).toMatchObject({ id: "https://www.example.org/a", title: "example.org", external: true, redirect: "https://www.example.org/a" });
    expect(isExternalTarget("mailto:a@b.c")).toBe(true);
    expect(isExternalTarget("/x/")).toBe(false);
  });

  it("resolvePages: a list is not re-sorted unless `sort:` is set; limit applies", () => {
    const items = [{ target: "MMSMammalWeight-A" }, { target: "LAMP-BUCKET-HAT" }, { target: "MMSCO2InCars" }];
    expect(resolvePages(NODES, { items }).map((n) => n.title[0])).toEqual(["V", "S", "C"]);
    expect(resolvePages(NODES, { items, sort: "alpha" }).map((n) => n.title[0])).toEqual(["C", "S", "V"]);
    expect(resolvePages(NODES, { items, limit: 2 })).toHaveLength(2);
  });
});

// ── renderer ─────────────────────────────────────────────────────────────────

describe("post card helpers", () => {
  it("parseShow", () => {
    expect(parseShow(undefined)).toBeNull();
    expect([...parseShow("image, Date, excerpt, bogus")]).toEqual(["image", "date", "excerpt"]);
    expect([...parseShow(["tags"])]).toEqual(["tags"]);
    expect(parseShow("all").size).toBe(5);
  });

  it("formatCardDate", () => {
    expect(formatCardDate("2024-08-23")).toBe("August 2024");
    expect(formatCardDate("2024-11-07, Written on")).toBe("November 2024");
    expect(formatCardDate("someday")).toBe("");
    expect(formatCardDate(undefined)).toBe("");
  });

  it("truncateExcerpt by words (default 30) and by sentences", () => {
    const long = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
    expect(truncateExcerpt(long).split(" ")).toHaveLength(30);
    expect(truncateExcerpt(long).endsWith("w29…")).toBe(true);
    expect(truncateExcerpt("a b c", 10)).toBe("a b c");
    expect(truncateExcerpt("One. Two! Three? Four.", "2 sentences")).toBe("One. Two!");
    expect(truncateExcerpt("", 5)).toBe("");
  });

  it("parseColumns accepts 1 to 6", () => {
    expect([parseColumns("2"), parseColumns(6), parseColumns(0), parseColumns(9), parseColumns("x")]).toEqual([2, 6, null, null, null]);
  });

  it("a page without an image gets a tinted panel, never an <img> without a source", () => {
    const html = renderPostCardHtml({ id: "/a/", title: "A", bloobIcon: "/favicon.png" }, { show: parseShow("image") });
    expect(html).toContain("fp-card__image-wrap--placeholder");
    expect(html).toContain('src="/favicon.png"');
    expect(html).not.toMatch(/<img(?![^>]*\bsrc="[^"]+")[^>]*>/);
    const bare = renderPostCardHtml({ id: "https://x.org", title: "X", external: true, host: "x.org", redirect: "https://x.org" }, { show: parseShow("image, date") });
    expect(bare).not.toContain("<img");
    expect(bare).toContain('target="_blank" rel="noopener"');
    expect(bare).toContain('<span class="fp-card__host">x.org</span>');
  });

  it("shows only the parts asked for", () => {
    const node = { id: "/a/", title: "A", image: "/og/a.png", date: "2024-08-23", excerpt: "Hello world.", card_tags: ["t1"] };
    const html = renderPostCardHtml(node, { show: parseShow("excerpt") });
    expect(html).toContain("Hello world.");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("August 2024");
    expect(html).not.toContain("fp-card__tag");
  });

  it("escapes titles and excerpts", () => {
    const html = renderPostCardHtml({ id: "/a/", title: "<b>&", excerpt: "<script>" }, { show: parseShow("excerpt") });
    expect(html).toContain("&lt;b&gt;&amp;");
    expect(html).toContain("&lt;script&gt;");
  });

  it("a list has no search box unless asked; query sources keep theirs", () => {
    expect(isSearchDisabled({ items: [] })).toBe(true);
    expect(isSearchDisabled({ items: [], search: "basics" })).toBe(false);
    expect(isSearchDisabled({ source: "folder=x" })).toBe(false);
  });

  it("without `show` or `columns` the cards are the historical markup", () => {
    const html = renderCollectionInner([{ id: "/a/", title: "A" }], { display: "cards" });
    expect(html).toContain('<div class="fp-cards">');
    expect(html).not.toContain("fp-card--post");
    expect(html).not.toContain("fp-cards--cols");
  });

  it("`columns` adds the column classes to either card style", () => {
    expect(renderCollectionInner([{ id: "/a/", title: "A" }], { columns: 2 })).toContain('<div class="fp-cards fp-cards--cols fp-cards--cols-2">');
  });
});

// ── host: the real transform ─────────────────────────────────────────────────

describe(":::collection blocks", () => {
  const BODY = [
    "display: cards",
    "show: image, date, excerpt, tags",
    "- [LAMP-BUCKET-HAT](/portfolio/LAMP-BUCKET-HAT/)",
    "- [MMSMammalWeight-A](/marbles/MMSMammalWeight-A/)",
    "- [Toxic CO2 levels in cars](/marbles/MMSCO2InCars/)",
    "- [Example](https://example.org)",
    '- <span class="broken-link" data-target="PRIVATE-NOTE">PRIVATE-NOTE</span>',
  ].join("\n");

  it("renders one card per listed page, in order, with no search box", () => {
    const out = transform(section(BODY));
    expect(out).toContain('<div class="collection-visualizer" data-pagefind-ignore');
    expect(hrefs(out)).toEqual([
      "/portfolio/LAMP-BUCKET-HAT/",
      "/marbles/MMSMammalWeight-A/",
      "/marbles/MMSCO2InCars/",
      "https://example.org",
    ]);
    expect(out).not.toContain("fp-search-input");
    expect(out).not.toContain("<section");
    expect(out).not.toContain("rendered inner html");
  });

  it("never prints a private page's name", () => {
    expect(transform(section(BODY))).not.toContain("PRIVATE-NOTE");
  });

  it("fills post cards from pagePreviews.json", () => {
    const out = transform(section(BODY));
    expect(out).toContain('<time class="fp-card__date" datetime="2024-08-23">August 2024</time>');
    expect(out).toContain("Humans and livestock now outweigh all wild mammals");
    expect(out).toContain('<span class="fp-card__tag">agriculture</span>');
    expect(out).toContain('src="/og/mammals-og.png"');
    // the lamp has an image but no preview text: still a clean card
    expect(out).toMatch(/href="\/portfolio\/LAMP-BUCKET-HAT\/"[\s\S]*?Sustainable bucket hat lamp/);
  });

  it("takes settings from the opener line too; lines in the block win", () => {
    const out = transform(section("- [[MMSCO2InCars]]\ndisplay: list", { display: "cards", search: "basics" }));
    expect(out).toContain("folder-preview__list");
    expect(out).toContain("fp-search-input");
  });

  it("leaves a block with neither a body nor settings alone (never lists the whole site)", () => {
    const bare = '<section class="collection">\n</section>';
    expect(transform(bare)).toBe(bare);
  });

  it("escapes quotes in the settings attribute", () => {
    const out = transform(section("titles: link\n- [Leon's page](/notes/my-page/)"));
    expect(out).toMatch(/data-collection-settings='[^']*&#39;[^']*'/);
    expect(out).toContain("Leon&#39;s page".replace("&#39;", "'"));
  });

  it("the source query forms still work inside :::", () => {
    const out = transform(section("source: folder=portfolio"));
    expect(hrefs(out)).toEqual(["/portfolio/LAMP-BUCKET-HAT/"]);
  });
});

describe("```collection fences with a list", () => {
  it("accept the same list (escaped HTML in the code block is decoded)", () => {
    const out = transform(fence("show: image\n- [[MMSCO2InCars]]\n- [x](https://example.org)"));
    expect(hrefs(out)).toEqual(["/marbles/MMSCO2InCars/", "https://example.org"]);
  });

  it("a fence without a list parses exactly as before", () => {
    const out = transform(fence("source: folder=marbles\ndisplay: list\n"));
    expect(out).toContain("data-collection-settings='{\"source\":\"folder=marbles\",\"display\":\"list\"}'");
    expect(out).toContain("fp-search-input");
  });
});
