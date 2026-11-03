import { describe, it, expect } from "vitest";
import { catalogFields } from "../../scripts/utils/catalog-fields.js";
import { closedPicturePath } from "../../lib/visualizers/marble/paths.js";

const base = { effectiveShape: "marble", frontmatter: {}, url: "/marbles/AUTOPOIESIS-A/", fileName: "AUTOPOIESIS-A", excerpt: "It is quite hard to define life." };

describe("catalogFields", () => {
  it("names the page's kind", () => expect(catalogFields(base).shape).toBe("marble"));

  it("a marble carries its picture's address and a steady color", () => {
    const f = catalogFields(base);
    expect(f.closedPicture).toBe(closedPicturePath("/marbles/AUTOPOIESIS-A/"));
    expect(f.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("a named color wins", () => expect(catalogFields({ ...base, frontmatter: { color: "#123456" } }).color).toBe("#123456"));

  it("public pages carry their first lines", () => expect(catalogFields(base).firstLines).toBe("It is quite hard to define life."));

  it("locked pages carry no first lines", () =>
    expect(catalogFields({ ...base, frontmatter: { visibility: "private" } }).firstLines).toBeUndefined());

  it("carries a subtitle written in the frontmatter", () =>
    expect(catalogFields({ ...base, frontmatter: { subtitle: "why" } }).subtitle).toBe("why"));

  it("a page with no kind gets nothing extra", () => expect(catalogFields({ ...base, effectiveShape: null })).toEqual({ firstLines: base.excerpt }));
});

describe("closedPicturePath", () => {
  it("is one file per page address, with small sizes beside it", () => {
    expect(closedPicturePath("/marbles/x/")).toBe("/og/marble/marbles--x.png");
    expect(closedPicturePath("/marbles/x/", 32)).toBe("/og/marble/marbles--x-32.png");
  });
});
