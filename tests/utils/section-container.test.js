import { describe, it, expect } from "vitest";
import { renderSectionOpen, parseSectionInfo, jsonAttr } from "../../scripts/utils/section-container.js";

// The exact regex every build-time visualizer uses to read its settings back.
const readSettings = (html) => {
  const m = html.match(/data-vis-settings='([^']+)'/);
  return m ? JSON.parse(m[1]) : {};
};

describe("section container — opening tag", () => {
  it("single-word fence keeps its exact shape", () => {
    expect(renderSectionOpen("bg-dark")).toBe('<section class="bg-dark">\n');
  });

  it("settings become single-quoted JSON the visualizers can read back", () => {
    const html = renderSectionOpen('image-grid title="Our Team" limit=3');
    expect(html).toBe(`<section class="image-grid" data-vis-settings='{"title":"Our Team","limit":"3"}'>\n`);
    expect(readSettings(html)).toEqual({ title: "Our Team", limit: "3" });
  });

  it("a fence cannot break out of the class attribute", () => {
    // Single word: the quote is escaped inside the class.
    expect(renderSectionOpen('x"onmouseover="alert(1)')).toBe(
      '<section class="x&quot;onmouseover=&quot;alert(1)">\n',
    );
    // With a space: the rest becomes a setting, JSON-escaped inside the
    // single-quoted attribute — never a second HTML attribute.
    const html = renderSectionOpen('x" onmouseover="alert(1)');
    expect(html.startsWith('<section class="x&quot;" data-vis-settings=\'')).toBe(true);
    expect(html).not.toMatch(/\sonmouseover=/);
    expect(readSettings(html)).toEqual({ onmouseover: '"alert(1)' });
  });

  it("a single quote in a setting cannot end the settings attribute", () => {
    const html = renderSectionOpen(`services title="it's fine" note='x'`);
    // exactly one opening and one closing quote around the JSON
    expect(html.match(/data-vis-settings='/g)).toHaveLength(1);
    expect(readSettings(html)).toEqual({ title: "it's fine", note: "'x'" });
  });

  it("angle brackets and ampersands in settings cannot inject markup", () => {
    const html = renderSectionOpen('card-preview title="<img src=x onerror=alert(1)> & co"');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("&amp;"); // no entities inside the JSON
    expect(readSettings(html)).toEqual({ title: "<img src=x onerror=alert(1)> & co" });
  });

  it("_raw and _rawsource are emitted only when they are base64", () => {
    const ok = renderSectionOpen("scene-nav _raw=aGVsbG8= _rawsource=d29ybGQ=");
    expect(ok).toBe('<section class="scene-nav" data-vis-raw="aGVsbG8=" data-vis-raw-source="d29ybGQ=">\n');
    const bad = renderSectionOpen('scene-nav _raw=x"onload="alert(1)');
    expect(bad).toBe('<section class="scene-nav">\n');
  });

  it("_raw is never left in the settings JSON", () => {
    const { settings, raw } = parseSectionInfo("scene-nav _raw=aGVsbG8= mode=strip");
    expect(raw).toBe("aGVsbG8=");
    expect(settings).toEqual({ mode: "strip" });
  });

  it("jsonAttr output is plain JSON", () => {
    const s = { a: "it's <b> & c" };
    expect(JSON.parse(jsonAttr(s))).toEqual(s);
    expect(jsonAttr(s)).not.toMatch(/['<>&]/);
  });
});
