import { describe, it, expect } from "vitest";
import { cleanMarkdownForSharing } from "../../scripts/utils/share-markdown.js";

const published = new Set(["autopoiesis-a", "pricing"]);
const clean = (md) => cleanMarkdownForSharing(md, { publishedSlugs: published });

describe("cleanMarkdownForSharing", () => {
  it("strips %% comments", () => expect(cleanMarkdownForSharing("a %%secret%% b", { publishedSlugs: new Set() })).toBe("a  b"));
  it("strips comments over several lines", () => expect(clean("a\n%%\nhidden\nlines\n%%\nb")).toBe("a\n\nb"));
  it("links to unpublished notes become plain text", () => {
    expect(clean("see [[Private Thought]] and [[Secret|this]]")).toBe("see Private Thought and this");
    expect(clean("see [words](Private%20Thought.md)")).toBe("see words");
  });
  it("links to published notes stay", () => {
    expect(clean("see [[AUTOPOIESIS-A]] and [p](pricing.md)")).toBe("see [[AUTOPOIESIS-A]] and [p](pricing.md)");
  });
  it("links to the web and pictures stay", () => {
    expect(clean("[site](https://bloob.haus) ![[photo.png]]")).toBe("[site](https://bloob.haus) ![[photo.png]]");
  });
  it("keeps only the title from the frontmatter", () => {
    expect(clean("---\ntitle: Hello\nvisibility: public\ntags: [a]\n---\nbody")).toBe("---\ntitle: Hello\n---\nbody");
    expect(clean("---\nvisibility: public\n---\nbody")).toBe("body");
  });

  it("strips HTML comments too, as the site does", () =>
    expect(clean("Hi <!-- private: call Bob --> there")).not.toContain("Bob"));
  it("embeds of unpublished notes are dropped; pictures and published notes stay", () => {
    expect(clean("a ![[Secret Diary]] b")).toBe("a  b");
    expect(clean("![[AUTOPOIESIS-A]] ![[photo.png]]")).toBe("![[AUTOPOIESIS-A]] ![[photo.png]]");
  });
});

// Triage 130abcf3 (Leon, 2026-11-04): the export carries its dates, and pictures point at the
// files the site actually serves, so a copied note still shows them anywhere.
describe("cleanMarkdownForSharing: dates and pictures", () => {
  const media = { "media/DSC00287.png": "/media/DSC00287.png", "photo one.png": "/media/photo one.png" };
  const opts = (extra = {}) => ({
    publishedSlugs: published,
    siteUrl: "https://leons.bloob.haus",
    resolveImage: (ref) => media[ref] ?? null,
    ...extra,
  });

  it("adds the created and updated dates the page shows", () => {
    const out = cleanMarkdownForSharing("---\ntitle: Hat\n---\nbody", opts({ dates: { created: "2025-09-17, Written on", updated: ["2025-10-01", "2025-12-24"] } }));
    expect(out).toBe("---\ntitle: Hat\ndate_created: 2025-09-17\ndate_updated: 2025-12-24\n---\nbody");
  });
  it("leaves out an updated date that equals the created one, and any missing date", () => {
    expect(cleanMarkdownForSharing("body", opts({ dates: { created: "2025-09-17", updated: "2025-09-17" } }))).toBe("---\ndate_created: 2025-09-17\n---\nbody");
    expect(cleanMarkdownForSharing("body", opts({ dates: {} }))).toBe("body");
  });
  it("points pictures at the site's public files", () => {
    expect(cleanMarkdownForSharing("![](media/DSC00287.png)", opts())).toBe("![](https://leons.bloob.haus/media/DSC00287.png)");
    expect(cleanMarkdownForSharing("![[photo one.png]]", opts())).toBe("![](https://leons.bloob.haus/media/photo%20one.png)");
    expect(cleanMarkdownForSharing("![[photo one.png|a hat]]", opts())).toBe("![a hat](https://leons.bloob.haus/media/photo%20one.png)");
    expect(cleanMarkdownForSharing("![[photo one.png|300]]", opts())).toBe("![](https://leons.bloob.haus/media/photo%20one.png)");
  });
  it("leaves pictures it cannot find, web pictures and note embeds alone", () => {
    expect(cleanMarkdownForSharing("![](gone.png) ![x](https://e.com/a.png) ![[AUTOPOIESIS-A]]", opts()))
      .toBe("![](gone.png) ![x](https://e.com/a.png) ![[AUTOPOIESIS-A]]");
  });
});
