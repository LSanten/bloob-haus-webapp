import { describe, it, expect } from "vitest";
import { peekTarget, extractObject } from "../../lib/visualizers/_engine/peek.js";

const site = "https://leons.bloob.haus";

describe("peekTarget", () => {
  it("a page on this site can be peeked", () => {
    expect(peekTarget("/marbles/glass/", site)).toBe("/marbles/glass/");
    expect(peekTarget("https://leons.bloob.haus/marbles/glass/#part", site)).toBe("/marbles/glass/");
  });
  it("links to other sites are not peeked", () => expect(peekTarget("https://example.com/a/", site)).toBeNull());
  it("files, tags, the search and links within the page are not peeked", () => {
    expect(peekTarget("/media/photo.png", site)).toBeNull();
    expect(peekTarget("/tags/yoga/", site)).toBeNull();
    expect(peekTarget("#part", site)).toBeNull();
    expect(peekTarget("mailto:a@b.c", site)).toBeNull();
    expect(peekTarget("/og/marble/a.png", site)).toBeNull();
  });
});

describe("extractObject", () => {
  it("takes the whole object out of a fetched page, nested parts included", () => {
    const html = '<html><body><header><div class="x">no</div></header><main><div class="bloob-object bloob-object--marble" data-shape="marble"><div class="bloob-object__closed"><div>a</div></div><div class="bloob-object__open"><p>words</p></div></div><footer>f</footer></main></body></html>';
    expect(extractObject(html)).toBe('<div class="bloob-object bloob-object--marble" data-shape="marble"><div class="bloob-object__closed"><div>a</div></div><div class="bloob-object__open"><p>words</p></div></div>');
  });
  it("a page without an object gives nothing (it is simply visited)", () =>
    expect(extractObject("<html><body><article class=\"sheet\">words</article></body></html>")).toBeNull());
});
