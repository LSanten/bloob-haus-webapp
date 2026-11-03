import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { loadTemplateShapes } from "../../../scripts/utils/template-shapes.js";
import { renderObject } from "../_engine/render.js";
import { isVisualizerUsed } from "../../../scripts/utils/visualizer-detection.js";

const VIS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let note;
beforeAll(async () => {
  note = (await loadTemplateShapes(VIS)).get("note");
});
const page = (data, html) => ({ data, html, url: "/n/", pageId: "n" });
const body = "<p>First paragraph.</p><p>Second paragraph, far down the paper.</p>";

describe("the note", () => {
  it("is a template shape that opens on click, remembers, and paces its opening by length", () => {
    expect(note.manifest).toMatchObject({ format: "template", opens: "click", remembers: "visitor", arrives: "open-from-site", pace: "length" });
  });

  it("draws the whole note in the HTML, so search engines and script-less readers get every word", () => {
    const html = renderObject(note, page({ title: "T" }, body));
    expect(html).toContain("First paragraph.");
    expect(html).toContain("Second paragraph, far down the paper.");
  });

  it("a locked note shows only its title on the tip", () => {
    const html = renderObject(note, page({ title: "Only the title" }, body), { locked: true });
    expect(html).toContain("Only the title");
    expect(html).not.toContain("paragraph");
  });

  it("the roll and the tip are real buttons with labels", () => {
    const html = renderObject(note, page({ title: "T" }, body));
    expect(html.match(/<button[^>]*data-bloob-toggle[^>]*aria-label="[^"]+"/g)?.length).toBe(2);
  });

  it("its stylesheet loads only on pages that have a note", () => {
    const vis = { detect: note.manifest.detect };
    expect(isVisualizerUsed(vis, renderObject(note, page({}, body)))).toBe(true);
    expect(isVisualizerUsed(vis, "<main><p>plain page</p></main>")).toBe(false);
  });
});
