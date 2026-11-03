/**
 * The live visualizer editor renders a note with the build's own code:
 * injectContainerRaw → the shared markdown setup → each shape's transform.
 * These tests use real shapes, so "the preview is the site" is checked, not assumed.
 */
import { describe, it, expect } from "vitest";
import { createNoteRenderer, createPageRenderer } from "../../lib/visualizer-editor/render-note.js";
import * as services from "../../lib/visualizers/services/index.js";

const note = `# A page

::: services id=offer
## What we do

We make things.

- Gardens
- Letters
:::
`;

describe("createNoteRenderer", () => {
  it("draws a ::: block with the shape's own renderer", () => {
    const render = createNoteRenderer({ visualizers: [{ name: "services", ...services }] });
    const html = render(note);
    expect(html).toContain('<section class="services" id="offer">');
    expect(html).toContain('<h1 class="services__title">What we do</h1>');
    expect(html).toContain("<li><h3>Gardens</h3></li>");
  });

  it("renders the rest of the note as normal markdown", () => {
    const render = createNoteRenderer({ visualizers: [] });
    expect(render("# Hi\n\nsome *text*")).toContain("<em>text</em>");
  });

  it("leaves a block alone when its shape is not loaded", () => {
    const render = createNoteRenderer({ visualizers: [] });
    expect(render(note)).toContain('<section class="services" data-vis-settings=');
  });

  it("runs transforms in transformOrder, like the build", () => {
    const calls = [];
    const later = { name: "later", type: "build-time", transformOrder: 100, transform: (h) => (calls.push("later"), h) };
    const first = { name: "first", type: "build-time", transform: (h) => (calls.push("first"), h) };
    createNoteRenderer({ visualizers: [later, first] })("x");
    expect(calls).toEqual(["first", "later"]);
  });

  it("skips runtime-only shapes, like the build", () => {
    let ran = false;
    const runtime = { name: "rt", type: "runtime", transform: (h) => ((ran = true), h) };
    createNoteRenderer({ visualizers: [runtime] })("x");
    expect(ran).toBe(false);
  });
});

describe("createPageRenderer (the article page a note sits in)", () => {
  const render = createPageRenderer({ visualizers: [] });

  it("takes the first # heading as the title and removes it from the body", () => {
    const html = render("# My page\n\nHello");
    expect(html).toContain('<h1 class="article-title">My page</h1>');
    expect(html.match(/My page/g)).toHaveLength(1);
    expect(html).toContain('<div class="article-body">');
  });

  it("takes a ## right under the title as the subtitle", () => {
    expect(render("# Title\n## A *subtitle*\n\nText")).toContain(
      '<p class="article-subtitle">A <em>subtitle</em></p>',
    );
  });

  it("draws no header when the note has no # heading", () => {
    const html = render("Just text");
    expect(html).not.toContain("article-header");
    expect(html).toContain("<p>Just text</p>");
  });

  it("draws the body with the visualizers, like createNoteRenderer", () => {
    const withServices = createPageRenderer({ visualizers: [{ name: "services", ...services }] });
    expect(withServices("# P\n\n::: services\n## S\n- a\n:::\n")).toContain('class="services__title"');
  });
});

import { parseFlatFrontmatter, createObjectPageRenderer } from "../../lib/visualizer-editor/render-note.js";
import { loadTemplateShapes } from "../../scripts/utils/template-shapes.js";

describe("objects in the editor", () => {
  it("reads a note's flat frontmatter", () => {
    expect(parseFlatFrontmatter('---\ntitle: "Hello: you"\ncolor: "#123456"\nbloob-shape: marble\n---\nbody')).toEqual({
      data: { title: "Hello: you", color: "#123456", "bloob-shape": "marble" },
      body: "body",
    });
    expect(parseFlatFrontmatter("no frontmatter")).toEqual({ data: {}, body: "no frontmatter" });
  });

  it("draws a marble note as a marble that opens into its article", async () => {
    const shapes = await loadTemplateShapes(new URL("../../lib/visualizers", import.meta.url).pathname);
    const render = createObjectPageRenderer({ visualizers: [], shape: shapes.get("marble") });
    const html = render("---\ntitle: Autopoiesis\ncolor: \"#7a9fd6\"\n---\nIt is quite hard to define life.");
    expect(html).toContain("bloob-object--marble");
    expect(html).toContain('class="article-page"');
    expect(html).toContain("It is quite hard to define life.");
    expect(html).toContain("Autopoiesis");
    expect(html).not.toContain('class="bloob-share"'); // nothing to share from the editor
  });
});
