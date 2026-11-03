import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { renderObject } from "../../lib/visualizers/_engine/render.js";
import { wrapWords } from "../../lib/visualizers/_engine/share.js";
import { loadTemplateShapes } from "../../scripts/utils/template-shapes.js";

const VIS = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../lib/visualizers");
let shapes;
beforeAll(async () => { shapes = await loadTemplateShapes(VIS); });
const page = { data: { title: "Autopoiesis <alive>", subtitle: "why it matters" }, html: "<p>It is quite hard to define life.</p>", url: "/a/", pageId: "a" };

describe("copy image", () => {
  it("the share row offers Copy image (not Save picture) and carries the title, subtitle and first lines", () => {
    const html = renderObject(shapes.get("marble"), page, { inside: "" });
    expect(html).toContain('data-share-action="image"');
    expect(html).toContain(">Copy image<");
    expect(html).not.toContain("Save picture");
    expect(html).toContain('data-title="Autopoiesis &lt;alive&gt;"');
    expect(html).toContain('data-subtitle="why it matters"');
    expect(html).toContain('data-lines="It is quite hard to define life."');
  });

  it("notes share too, so a phone can open the note from the copied image", () => {
    expect(shapes.get("note").manifest.shares).toBe(true);
    expect(renderObject(shapes.get("note"), page)).toContain('class="bloob-share"');
  });

  it("a locked object's card carries no first lines", () => {
    expect(renderObject(shapes.get("marble"), page, { locked: true })).not.toContain("data-lines");
  });
});

describe("wrapWords", () => {
  const measure = (t) => t.length * 10;
  it("breaks text into lines that fit", () =>
    expect(wrapWords("one two three four five", measure, 100)).toEqual(["one two", "three four", "five"]));
  it("cuts after the last allowed line with an ellipsis", () =>
    expect(wrapWords("one two three four five", measure, 100, 2)).toEqual(["one two", "three four…"]));
});
