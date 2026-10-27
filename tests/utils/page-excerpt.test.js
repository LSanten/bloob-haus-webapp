import { describe, it, expect } from "vitest";
import { extractExcerpt, EXCERPT_MAX_WORDS } from "../../scripts/utils/page-excerpt.js";

describe("extractExcerpt", () => {
  it("returns the first prose, as plain text", () => {
    const md = "Welcome to my **communication** experiment. It is *not* a blog.\n\nSecond paragraph.";
    expect(extractExcerpt(md)).toBe("Welcome to my communication experiment. It is not a blog. Second paragraph.");
  });

  it("reduces links to their text and drops images", () => {
    const md = "![](/media/a.png)\nI wrote about it [in this marble](/marbles/MMSCommuniA/) and [[Other|here]].";
    expect(extractExcerpt(md)).toBe("I wrote about it in this marble and here.");
  });

  it("skips headings, code, tables, HTML blocks and bare URLs", () => {
    const md = [
      "## > Transcript",
      "```js",
      "const x = 1;",
      "```",
      "| a | b |",
      '<iframe src="https://youtube.com"></iframe>',
      "https://example.org/page",
      "Real text here.",
    ].join("\n");
    expect(extractExcerpt(md)).toBe("Real text here.");
  });

  it("skips whole ::: blocks (their insides are shape data)", () => {
    const md = ':::collection _raw="abc"\ndisplay: cards\n- [A](/a/)\n:::\n\nAfter the cards.';
    expect(extractExcerpt(md)).toBe("After the cards.");
  });

  it("keeps list items and blockquotes without their markers", () => {
    const md = "- first point\n- [ ] a task\n> a quote\n1. numbered";
    expect(extractExcerpt(md)).toBe("first point a task a quote numbered");
  });

  it("keeps the text of a broken-link span (never the private target)", () => {
    const md = 'See <span class="broken-link" data-target="secret">this note</span>.';
    expect(extractExcerpt(md)).toBe("See this note.");
  });

  it("removes footnote references and definitions", () => {
    expect(extractExcerpt("A claim.[^1]\n\n[^1]: The source.")).toBe("A claim.");
  });

  it("stops at maxWords", () => {
    const md = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    expect(extractExcerpt(md).split(" ")).toHaveLength(EXCERPT_MAX_WORDS);
    expect(extractExcerpt(md, { maxWords: 5 })).toBe("w0 w1 w2 w3 w4");
  });

  it("returns an empty string for a page without prose", () => {
    expect(extractExcerpt("![](/media/a.png)\n\n## Heading only")).toBe("");
    expect(extractExcerpt("")).toBe("");
  });

  it("does not eat snake_case words", () => {
    expect(extractExcerpt("set show_fields here")).toBe("set show_fields here");
  });
});
