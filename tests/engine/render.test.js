import { describe, it, expect } from "vitest";
import { renderObject } from "../../lib/visualizers/_engine/render.js";

const note = (data, html = "") => ({ data, html, url: "/n/", pageId: "n" });

// A tip-style shape: no closed.html, its closed look is the open one at 0.
const tip = {
  name: "note",
  manifest: { name: "note", opens: "click", remembers: "visitor" },
  templates: { open: '<div class="paper"><h1>{{ title }}</h1>{{ body }}</div>' },
};
// A shape with a closed look of its own and an inside.
const marble = {
  name: "marble",
  manifest: { name: "marble", opens: "click", arrives: "open-from-site", shares: true },
  templates: {
    closed: '<span class="t">{{ title }}</span><span class="l">{{ firstLines }}</span><span class="b">{{ body }}</span>',
    open: "<article>{{ inside }}</article>",
  },
};

describe("renderObject", () => {
  it("shows open without script, with every word in the HTML", () => {
    const html = renderObject(tip, note({ title: "T" }, "<p>full body words</p>"));
    expect(html).toContain('data-state="open"');
    expect(html).toContain("--open:1");
    expect(html).toContain("full body words");
  });

  it("carries its identity and the manifest's switches as data attributes", () => {
    const html = renderObject(tip, note({ title: "T" }));
    expect(html).toContain('data-shape="note"');
    expect(html).toContain('class="bloob-object bloob-object--note"');
    expect(html).toContain('data-page-id="n"');
    expect(html).toContain('data-opens="click"');
    expect(html).toContain('data-remembers="visitor"');
    expect(html).not.toContain("data-arrives");
  });

  it("a locked tip-style object shows only its title outside and nothing of the inside", () => {
    const html = renderObject(tip, note({ title: "Only this" }, "<p>secret words</p>"), { locked: true });
    expect(html).toContain("Only this");
    expect(html).not.toContain("secret");
    expect(html).toContain('data-state="closed"');
  });

  it("closed.html never receives the body", () => {
    const html = renderObject(marble, note({ title: "T" }, "<p>the body itself</p>"));
    const closed = html.split('class="bloob-object__open"')[0];
    expect(closed).toContain('<span class="b"></span>');
  });

  it("closed.html gets the first lines only when the note is open to read", () => {
    const body = "<p>first words here</p>";
    expect(renderObject(marble, note({ title: "T" }, body))).toContain("first words here");
    expect(renderObject(marble, note({ title: "T" }, body), { sealed: true })).not.toContain("first words here");
  });

  it("puts a nested object's HTML where the inside goes", () => {
    const html = renderObject(marble, note({ title: "T" }), { inside: "<p>inner</p>" });
    expect(html).toContain("<article><p>inner</p></article>");
  });

  it("escapes the page id", () => {
    expect(renderObject(tip, { ...note({}), pageId: 'a"b' })).toContain('data-page-id="a&quot;b"');
  });
});
