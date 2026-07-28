import { describe, it, expect } from "vitest";
import {
  isVisualizerUsed,
  detectVisualizers,
  renderAssetTags,
} from "../../scripts/utils/visualizer-detection.js";

const VIS = [
  { name: "collection",     hasCss: true,  hasJs: true,  detect: { selectors: [".collection-visualizer"] } },
  { name: "graph",          hasCss: true,  hasJs: true,  detect: { selectors: [".graph-visualizer"] } },
  { name: "latex",          hasCss: true,  hasJs: true,  detect: { always: true } },
  { name: "unannotated",    hasCss: true,  hasJs: true },
  { name: "cssonly",        hasCss: true,  hasJs: false, detect: { selectors: [".cssonly-thing"] } },
  { name: "nothing",        hasCss: false, hasJs: false, detect: { selectors: [".nope"] } },
];

describe("isVisualizerUsed", () => {
  it("matches a class token present in the html", () => {
    const html = `<div class="collection-visualizer" data-x="1"></div>`;
    expect(isVisualizerUsed(VIS[0], html)).toBe(true);
  });

  it("does not match when the class is absent", () => {
    expect(isVisualizerUsed(VIS[0], `<div class="graph-visualizer"></div>`)).toBe(false);
  });

  it("matches a class among several in one attribute", () => {
    const html = `<div class="wrapper collection-visualizer active"></div>`;
    expect(isVisualizerUsed(VIS[0], html)).toBe(true);
  });

  it("does not match a longer class that merely contains the name", () => {
    // The bug a naive `html.includes()` would have: this must NOT count.
    const html = `<div class="collection-visualizer-legacy-wrapper"></div>`;
    expect(isVisualizerUsed(VIS[0], html)).toBe(false);
  });

  it("matches an attribute selector", () => {
    const vis = { name: "x", detect: { selectors: ["[data-comment-key]"] } };
    expect(isVisualizerUsed(vis, `<li data-comment-key="a"></li>`)).toBe(true);
    expect(isVisualizerUsed(vis, `<li data-other="a"></li>`)).toBe(false);
  });

  it("matches an id selector", () => {
    const vis = { name: "x", detect: { selectors: ["#musings-swiper"] } };
    expect(isVisualizerUsed(vis, `<div id="musings-swiper"></div>`)).toBe(true);
    expect(isVisualizerUsed(vis, `<div id="other"></div>`)).toBe(false);
  });

  it("matches if ANY selector matches", () => {
    const vis = { name: "x", detect: { selectors: [".a", ".b"] } };
    expect(isVisualizerUsed(vis, `<div class="b"></div>`)).toBe(true);
  });

  it("always: true is used regardless of content", () => {
    expect(isVisualizerUsed(VIS[2], "<p>nothing here</p>")).toBe(true);
  });

  // The safety property the whole feature rests on.
  it("a visualizer with NO detect block is always used", () => {
    expect(isVisualizerUsed(VIS[3], "<p>nothing here</p>")).toBe(true);
  });

  it("an empty selectors array is treated as unannotated (always used)", () => {
    expect(isVisualizerUsed({ name: "x", detect: { selectors: [] } }, "<p></p>")).toBe(true);
  });
});

describe("detectVisualizers", () => {
  const html = `<main><div class="collection-visualizer"></div></main>`;

  it("returns only used visualizers that actually have the asset", () => {
    const r = detectVisualizers(VIS, html, { enabled: true });
    expect(r.css).toEqual(["collection", "latex", "unannotated"]);
    expect(r.js).toEqual(["collection", "latex", "unannotated"]);
  });

  it("omits visualizers with no assets even when detected", () => {
    const r = detectVisualizers(VIS, `<div class="nope"></div>`, { enabled: true });
    expect(r.css).not.toContain("nothing");
    expect(r.js).not.toContain("nothing");
  });

  it("respects hasCss/hasJs independently", () => {
    const r = detectVisualizers(VIS, `<div class="cssonly-thing"></div>`, { enabled: true });
    expect(r.css).toContain("cssonly");
    expect(r.js).not.toContain("cssonly");
  });

  it("when disabled, returns EVERY visualizer with assets (current behavior)", () => {
    const r = detectVisualizers(VIS, "<p>empty</p>", { enabled: false });
    expect(r.css).toEqual(["collection", "graph", "latex", "unannotated", "cssonly"]);
    expect(r.js).toEqual(["collection", "graph", "latex", "unannotated"]);
  });

  it("defaults to disabled when no options are passed", () => {
    expect(detectVisualizers(VIS, "<p>empty</p>").css).toHaveLength(5);
  });

  it("reports what it skipped, for the build log", () => {
    const r = detectVisualizers(VIS, html, { enabled: true });
    expect(r.skipped).toContain("graph");
    expect(r.skipped).toContain("cssonly");
  });
});

describe("renderAssetTags", () => {
  it("renders css links and js scripts with the url prefix applied", () => {
    const { css, js } = renderAssetTags(["collection"], ["collection"], "/");
    expect(css).toBe('<link rel="stylesheet" href="/assets/css/visualizers/collection.css">');
    expect(js).toBe('<script src="/assets/js/visualizers/collection.js"></script>');
  });

  it("honours a mount-path prefix", () => {
    const { css } = renderAssetTags(["graph"], [], "/marbles/");
    expect(css).toContain('href="/marbles/assets/css/visualizers/graph.css"');
  });

  it("returns empty strings for empty input", () => {
    const { css, js } = renderAssetTags([], [], "/");
    expect(css).toBe("");
    expect(js).toBe("");
  });

  it("preserves order and emits one tag per entry", () => {
    const { css } = renderAssetTags(["a", "b"], [], "/");
    expect(css.match(/<link/g)).toHaveLength(2);
    expect(css.indexOf("a.css")).toBeLessThan(css.indexOf("b.css"));
  });
});
