import { describe, it, expect } from "vitest";
import { deriveBlanks } from "../../lib/visualizers/_engine/blanks.js";

const note = (data, html = "") => ({ data, html, url: "/n/", pageId: "n" });

describe("deriveBlanks", () => {
  it("locked notes get no inside", () => {
    const b = deriveBlanks(note({ title: "T" }, "<p>secret</p>"), { locked: true });
    expect(b.inside).toBeNull();
    expect(JSON.stringify(b.outside)).not.toContain("secret");
  });

  it("sealed notes get no inside", () => {
    expect(deriveBlanks(note({ title: "T" }, "<p>secret</p>"), { sealed: true }).inside).toBeNull();
  });

  it("frontmatter values are outside", () => {
    const b = deriveBlanks(note({ title: "T", subtitle: "S", color: "#123456", mood: "calm" }));
    expect(b.outside).toMatchObject({ title: "T", subtitle: "S", color: "#123456" });
    expect(b.outside.yaml.mood).toBe("calm");
  });

  it("an image named in the frontmatter is a cover everyone sees", () => {
    expect(deriveBlanks(note({ image: "/cover.png" }), { locked: true }).outside.image).toBe("/cover.png");
  });

  it("an image taken from the body is inside", () => {
    const data = { image: "/og/a.png", image_source: "body" };
    expect(deriveBlanks(note(data), { sealed: true }).outside.image).toBeUndefined();
    expect(deriveBlanks(note(data)).inside.image).toBe("/og/a.png");
  });

  it("heading is the title the writer gave, empty when the host only made a name from the filename", () => {
    expect(deriveBlanks(note({ title: "Given" })).outside.heading).toBe("Given");
    expect(deriveBlanks(note({ title: "2026 11 07 Aden Set", title_from_filename: true })).outside.heading).toBeUndefined();
    // the name stays, for everything that needs one (the closed look, the share card)
    expect(deriveBlanks(note({ title: "2026 11 07 Aden Set", title_from_filename: true })).outside.title).toBe("2026 11 07 Aden Set");
  });

  it("the body is inside", () => {
    expect(deriveBlanks(note({}, "<p>hello</p>")).inside.body).toBe("<p>hello</p>");
  });

  it("firstLines is plain text from the first paragraphs", () => {
    const b = deriveBlanks(note({}, "<h1>Title</h1><p>Hello <em>there</em></p><p>Second</p>"));
    expect(b.inside.firstLines).toBe("Hello there Second");
  });

  it("firstLines stops at 280 characters on a word", () => {
    const words = Array(100).fill("lorem").join(" ");
    const lines = deriveBlanks(note({}, `<p>${words}</p>`)).inside.firstLines;
    expect(lines.length).toBeLessThanOrEqual(280);
    expect(lines.endsWith("lorem")).toBe(true);
  });
});
