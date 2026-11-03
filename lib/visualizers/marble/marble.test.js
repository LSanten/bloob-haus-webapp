import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { loadTemplateShapes, generatedLayout } from "../../../scripts/utils/template-shapes.js";
import { renderObject } from "../_engine/render.js";
import { decideInitialState } from "../_engine/state.js";

const VIS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let marble;
beforeAll(async () => {
  marble = (await loadTemplateShapes(VIS)).get("marble");
});
const page = (data) => ({ data: { title: "Autopoiesis", closed_picture: "/og/marble/marbles--a.png", ...data }, html: "<p>It is quite hard to define life.</p>", url: "/marbles/a/", pageId: "a" });
const inside = '<article class="article-page"><div class="article-body"><p>It is quite hard to define life.</p></div></article>';

describe("the marble", () => {
  it("is a template shape that opens on click, isn't remembered, and shares", () => {
    expect(marble.draft).toBeFalsy();
    expect(marble.manifest).toMatchObject({ format: "template", opens: "click", remembers: false, arrives: "open-from-site", shares: true, inside: "article" });
  });

  it("an outside arrival is closed, the words are still in the HTML", () => {
    expect(decideInitialState({ remembered: false, arrivedFromSite: false, opensOnArrival: true, hash: "" })).toBe("closed");
    const html = renderObject(marble, page({}), { inside });
    expect(html).toContain("It is quite hard to define life.");
  });

  it("shows its baked picture and its title when closed", () => {
    const closed = renderObject(marble, page({}), { inside }).split('class="bloob-object__open"')[0];
    expect(closed).toContain('src="/og/marble/marbles--a.png"');
    expect(closed).toContain("Autopoiesis");
    expect(closed).toContain("data-bloob-toggle");
    // baked fresh every build: the image optimizer's name-keyed cache must not swap in an old one
    expect(closed).toMatch(/class="[^"]*no-optimize[^"]*" src="\/og\/marble\//);
  });

  it("tells you it opens: click (or tap) the marble", () => {
    const closed = renderObject(marble, page({}), { inside }).split('class="bloob-object__open"')[0];
    expect(closed).toContain("Click the marble to open it");
    expect(closed).toContain("Tap the marble to open it");
  });

  it("doesn't grow while it opens, so the picture never seems to zoom", async () => {
    const css = (await import("fs")).readFileSync(new URL("./styles.css", import.meta.url), "utf-8");
    expect(css).not.toMatch(/scale\(calc\(1 \+ var\(--open\)/);
  });

  it("always shows its subtitle when closed (Leon)", () => {
    const closed = renderObject(marble, page({ subtitle: "why it matters" }), { inside }).split('class="bloob-object__open"')[0];
    expect(closed).toContain('<p class="marble-subtitle">why it matters</p>');
  });

  it("says what a marble is when the haus describes it", () => {
    const html = renderObject(marble, page({ object_label: "marble", object_about: "A container for a note." }), { inside });
    expect(html).toContain("What is a marble?");
    expect(html).toContain("A container for a note.");
  });

  it("the outermost marble carries the share row; a marble inside another object does not", () => {
    expect(renderObject(marble, page({}), { inside })).toContain('class="bloob-share"');
    expect(renderObject(marble, page({}), { inside, outermost: false })).not.toContain('class="bloob-share"');
  });

  it("the article inside has no share bar of its own", () => {
    const layout = generatedLayout("marble", { inside: "article" });
    expect(layout).toMatch(/set inside_object = true[\s\S]*include "partials\/article-reading.njk"/);
    expect(layout).toContain('{% bloobObject "marble", content, bloobInside %}');
  });
});
