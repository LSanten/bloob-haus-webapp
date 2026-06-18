import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8")
);

const mod = await import("./index.js");
const { parseSource, filterNodes, sortAndLimit, resolvePages } = await import("./core.js");
const { renderCardHtml, renderCardGridHtml, parseShowFields } = await import("./render-card.js");

// ── manifest ─────────────────────────────────────────────────────────────────

describe("collection manifest", () => {
  it("has required fields", () => {
    expect(manifest.name).toBe("collection");
    expect(manifest.type).toMatch(/^(runtime|build-time|hybrid)$/);
    expect(manifest.version).toBeDefined();
    expect(manifest.description).toBeDefined();
  });

  it("is hybrid type", () => {
    expect(manifest.type).toBe("hybrid");
  });

  it("references files that exist on disk", () => {
    for (const [key, filename] of Object.entries(manifest.files || {})) {
      const filePath = path.join(__dirname, filename);
      expect(
        fs.existsSync(filePath),
        `manifest.files.${key} → "${filename}" should exist`
      ).toBe(true);
    }
  });
});

// ── index.js exports ──────────────────────────────────────────────────────────

describe("collection index.js exports", () => {
  it("exports name matching manifest", () => {
    expect(mod.name).toBe("collection");
  });

  it("exports type matching manifest", () => {
    expect(mod.type).toBe("hybrid");
  });

  it("exports transform function", () => {
    expect(typeof mod.transform).toBe("function");
  });

  it("exports renderFilescope function", () => {
    expect(typeof mod.renderFilescope).toBe("function");
  });

  it("transform returns html unchanged when no collection fence", () => {
    const html = "<p>Hello world</p>";
    expect(mod.transform(html)).toBe(html);
  });

  it("transform replaces collection code fence with div", () => {
    const html = `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`;
    const result = mod.transform(html);
    expect(result).toContain("collection-visualizer");
    expect(result).not.toContain("<pre><code");
  });

  it("renderFilescope emits a runtime placeholder div", () => {
    const result = mod.renderFilescope({ source: "folder=projects" }, "");
    expect(result).toContain("collection-visualizer");
    expect(result).toContain("data-collection-settings");
  });

  it("transform preserves search:fulltext in data-collection-settings (runtime placeholder path)", () => {
    // display:list never needs graph.json — always emits runtime placeholder,
    // so this test works without a real graph.json on disk.
    const html = `<pre><code class="language-collection">source: folder=projects\ndisplay: list\nsearch: fulltext\n</code></pre>`;
    const result = mod.transform(html);
    expect(result).toContain('"search":"fulltext"');
  });
});

// ── core.js ────────────────────────────────────────────────────────────────────

describe("parseSource", () => {
  it("parses folder= prefix", () => {
    expect(parseSource("folder=projects")).toEqual({ type: "folder", value: "projects" });
  });

  it("parses tag= prefix", () => {
    expect(parseSource("tag=sustainability")).toEqual({ type: "tag", value: "sustainability" });
  });

  it("parses field: prefix", () => {
    expect(parseSource("field:building_type=School")).toEqual({
      type: "field",
      key: "building_type",
      value: "School",
    });
  });

  it("defaults to all for null/undefined/empty", () => {
    expect(parseSource(null)).toEqual({ type: "all" });
    expect(parseSource("")).toEqual({ type: "all" });
    expect(parseSource("all")).toEqual({ type: "all" });
  });

  it("defaults to all for unrecognised prefix", () => {
    expect(parseSource("links-here")).toEqual({ type: "all" });
  });
});

const sampleNodes = [
  { id: "/projects/",        section: "projects", type: "page",     website_status: "public",   title: "Index" },
  { id: "/projects/alpha/",  section: "projects", type: "page",     website_status: "public",   title: "Alpha", tags: ["sustainability"] },
  { id: "/projects/beta/",   section: "projects", type: "page",     website_status: "archived",  title: "Beta" },
  { id: "/projects/gamma/",  section: "projects", type: "page",     website_status: "public",   title: "Gamma", building_type: "School" },
  { id: "/articles/intro/",  section: "articles", type: "page",     website_status: "public",   title: "Intro" },
  { id: "/tags/sustainability/", section: "tags", type: "tag",      website_status: "public",   title: "#sustainability" },
];

describe("filterNodes — folder", () => {
  it("returns pages in the folder, excluding index and archived", () => {
    const results = filterNodes(sampleNodes, "folder=projects");
    const ids = results.map((n) => n.id);
    expect(ids).toContain("/projects/alpha/");
    expect(ids).toContain("/projects/gamma/");
    expect(ids).not.toContain("/projects/");
    expect(ids).not.toContain("/projects/beta/"); // archived
    expect(ids).not.toContain("/articles/intro/");
  });
});

describe("filterNodes — tag", () => {
  it("returns pages tagged with the given tag", () => {
    const results = filterNodes(sampleNodes, "tag=sustainability");
    expect(results.map((n) => n.id)).toEqual(["/projects/alpha/"]);
  });

  it("is case-insensitive", () => {
    const results = filterNodes(sampleNodes, "tag=Sustainability");
    expect(results.length).toBe(1);
  });
});

describe("filterNodes — field", () => {
  it("returns pages where the field matches", () => {
    const results = filterNodes(sampleNodes, "field:building_type=School");
    expect(results.map((n) => n.id)).toEqual(["/projects/gamma/"]);
  });
});

describe("filterNodes — all", () => {
  it("returns all non-archived pages (no tags)", () => {
    const results = filterNodes(sampleNodes, "all");
    const ids = results.map((n) => n.id);
    expect(ids).toContain("/projects/alpha/");
    expect(ids).toContain("/projects/gamma/");
    expect(ids).not.toContain("/projects/beta/"); // archived
    expect(ids).not.toContain("/tags/sustainability/"); // type: tag
  });
});

describe("sortAndLimit", () => {
  const pages = [
    { title: "Zebra" },
    { title: "Apple" },
    { title: "Mango" },
  ];

  it("sorts alpha by default", () => {
    const result = sortAndLimit(pages);
    expect(result.map((p) => p.title)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("sorts reverse-alpha", () => {
    const result = sortAndLimit(pages, { sort: "reverse-alpha" });
    expect(result.map((p) => p.title)).toEqual(["Zebra", "Mango", "Apple"]);
  });

  it("respects limit", () => {
    const result = sortAndLimit(pages, { limit: 2 });
    expect(result.length).toBe(2);
  });

  it("does not mutate the input array", () => {
    const copy = [...pages];
    sortAndLimit(pages, { sort: "reverse-alpha" });
    expect(pages).toEqual(copy);
  });
});

// ── render-card.js ────────────────────────────────────────────────────────────

describe("parseShowFields", () => {
  it("parses comma-separated string", () => {
    expect(parseShowFields("a, b, c")).toEqual(["a", "b", "c"]);
  });

  it("passes through arrays", () => {
    expect(parseShowFields(["x", "y"])).toEqual(["x", "y"]);
  });

  it("returns empty array for falsy input", () => {
    expect(parseShowFields(null)).toEqual([]);
    expect(parseShowFields("")).toEqual([]);
  });
});

describe("renderCardHtml", () => {
  const node = {
    id: "/projects/alpha/",
    title: "Alpha Project",
    subtitle: "A great project",
    image: "/og/alpha-og.jpeg",
  };

  it("renders an anchor with the node id as href", () => {
    const html = renderCardHtml(node);
    expect(html).toContain('href="/projects/alpha/"');
  });

  it("renders the title in fp-card__title span", () => {
    const html = renderCardHtml(node);
    expect(html).toContain("fp-card__title");
    expect(html).toContain("Alpha Project");
  });

  it("renders subtitle when present", () => {
    const html = renderCardHtml(node);
    expect(html).toContain("fp-card__subtitle");
    expect(html).toContain("A great project");
  });

  it("includes no-pswp class on image", () => {
    const html = renderCardHtml(node);
    expect(html).toContain('class="no-pswp"');
  });

  it("renders fp-card__image-wrap (canonical class, not legacy img-wrap)", () => {
    const html = renderCardHtml(node);
    expect(html).toContain("fp-card__image-wrap");
    expect(html).not.toContain("fp-card__img-wrap");
  });

  it("renders placeholder when no image", () => {
    const html = renderCardHtml({ id: "/x/", title: "X" });
    expect(html).toContain("fp-card__image-wrap--placeholder");
    expect(html).not.toContain("<img");
  });

  it("renders redirect as href with external attrs when redirect present", () => {
    const html = renderCardHtml({ id: "/x/", title: "X", redirect: "https://example.com" });
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
  });

  it("escapes HTML special characters in title", () => {
    const html = renderCardHtml({ id: "/x/", title: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders field rows when showFields provided", () => {
    const nodeWithFields = { ...node, building_type: "School" };
    const html = renderCardHtml(nodeWithFields, { showFields: ["building_type"] });
    expect(html).toContain("fp-card__fields");
    expect(html).toContain("School");
    expect(html).toContain("Type");
  });
});

describe("renderCardGridHtml", () => {
  it("returns empty message when no pages", () => {
    const html = renderCardGridHtml([]);
    expect(html).toContain("collection__empty");
  });

  it("wraps cards in fp-cards grid", () => {
    const html = renderCardGridHtml([
      { id: "/a/", title: "A" },
      { id: "/b/", title: "B" },
    ]);
    expect(html).toContain('class="fp-cards"');
    expect(html).toContain("A");
    expect(html).toContain("B");
  });
});
