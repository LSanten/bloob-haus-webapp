import { describe, it, expect } from "vitest";
import { buildGraph, sectionFromUrl, stripAnchor } from "../../scripts/utils/graph-builder.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makePages(entries) {
  // Convenience: build perPageLinks from an array of [url, title, outgoing[]]
  return Object.fromEntries(
    entries.map(([url, title, outgoing = []]) => [url, { title, outgoing }])
  );
}

// ─── sectionFromUrl ───────────────────────────────────────────────────────────

describe("sectionFromUrl", () => {
  it("returns the first path segment for nested pages", () => {
    expect(sectionFromUrl("/recipes/chai/")).toBe("recipes");
    expect(sectionFromUrl("/notes/spices/")).toBe("notes");
    expect(sectionFromUrl("/resources/tools/my-tool/")).toBe("resources");
  });

  it("returns empty string for root-level pages", () => {
    expect(sectionFromUrl("/about/")).toBe("");
    expect(sectionFromUrl("/index/")).toBe("");
  });
});

// ─── stripAnchor ─────────────────────────────────────────────────────────────

describe("stripAnchor", () => {
  it("removes heading anchors from URLs", () => {
    expect(stripAnchor("/recipes/chai/#instructions")).toBe("/recipes/chai/");
    expect(stripAnchor("/notes/spices/#cumin")).toBe("/notes/spices/");
  });

  it("leaves URLs without anchors unchanged", () => {
    expect(stripAnchor("/recipes/chai/")).toBe("/recipes/chai/");
  });
});

// ─── buildGraph ───────────────────────────────────────────────────────────────

describe("buildGraph", () => {
  it("produces one node per page", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai"],
      ["/notes/spices/", "Spice Notes"],
    ]);
    const { nodes } = buildGraph(pages);
    expect(nodes).toHaveLength(2);
  });

  it("sets node id to the page URL", () => {
    const pages = makePages([["/recipes/chai/", "Masala Chai"]]);
    const { nodes } = buildGraph(pages);
    expect(nodes[0].id).toBe("/recipes/chai/");
  });

  it("sets node title from page data", () => {
    const pages = makePages([["/recipes/chai/", "Masala Chai"]]);
    const { nodes } = buildGraph(pages);
    expect(nodes[0].title).toBe("Masala Chai");
  });

  it("derives section from URL", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai"],
      ["/notes/spices/", "Spice Notes"],
      ["/about/", "About"],
    ]);
    const { nodes } = buildGraph(pages);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId["/recipes/chai/"].section).toBe("recipes");
    expect(byId["/notes/spices/"].section).toBe("notes");
    expect(byId["/about/"].section).toBe("");
  });

  it("creates a link between two connected pages", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai", ["/notes/spices/"]],
      ["/notes/spices/", "Spice Notes"],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({
      source: "/recipes/chai/",
      target: "/notes/spices/",
    });
  });

  it("strips heading anchors from outgoing link URLs", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai", ["/notes/spices/#cumin"]],
      ["/notes/spices/", "Spice Notes"],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe("/notes/spices/");
  });

  it("deduplicates links — same pair referenced twice produces one link", () => {
    const pages = makePages([
      [
        "/recipes/chai/",
        "Masala Chai",
        ["/notes/spices/", "/notes/spices/"],
      ],
      ["/notes/spices/", "Spice Notes"],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(1);
  });

  it("deduplicates anchor variants of the same link", () => {
    const pages = makePages([
      [
        "/recipes/chai/",
        "Masala Chai",
        ["/notes/spices/#cumin", "/notes/spices/#cardamom"],
      ],
      ["/notes/spices/", "Spice Notes"],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(1);
  });

  it("drops self-links", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai", ["/recipes/chai/"]],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(0);
  });

  it("drops links to pages not in the graph (unknown / external)", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai", ["/notes/does-not-exist/"]],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(0);
  });

  it("returns empty nodes and links for an empty input", () => {
    const { nodes, links } = buildGraph({});
    expect(nodes).toHaveLength(0);
    expect(links).toHaveLength(0);
  });

  it("handles bidirectional links correctly", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai", ["/notes/spices/"]],
      ["/notes/spices/", "Spice Notes", ["/recipes/chai/"]],
    ]);
    const { links } = buildGraph(pages);
    // Both directions are distinct links
    expect(links).toHaveLength(2);
    const pairs = links.map((l) => `${l.source}→${l.target}`);
    expect(pairs).toContain("/recipes/chai/→/notes/spices/");
    expect(pairs).toContain("/notes/spices/→/recipes/chai/");
  });

  it("handles a page with no outgoing links", () => {
    const pages = makePages([
      ["/recipes/chai/", "Masala Chai"],
      ["/notes/spices/", "Spice Notes"],
    ]);
    const { nodes, links } = buildGraph(pages);
    expect(nodes).toHaveLength(2);
    expect(links).toHaveLength(0);
  });

  it("handles multiple links from one page to many targets", () => {
    const pages = makePages([
      [
        "/recipes/chai/",
        "Masala Chai",
        ["/notes/spices/", "/notes/milk/", "/recipes/latte/"],
      ],
      ["/notes/spices/", "Spice Notes"],
      ["/notes/milk/", "Milk Notes"],
      ["/recipes/latte/", "Latte"],
    ]);
    const { links } = buildGraph(pages);
    expect(links).toHaveLength(3);
  });
});
