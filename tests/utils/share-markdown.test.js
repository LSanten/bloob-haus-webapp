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
