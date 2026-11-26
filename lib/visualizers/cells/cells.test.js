import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const page = readFileSync(path.join(dir, "page.html"), "utf-8");
const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf-8"));
const example = page.match(/<script type="text\/markdown" id="seeds">\n([\s\S]*?)\n<\/script>/)?.[1] ?? "";

describe("cells, a one-page visualizer", () => {
  it("is a page, published by the visualizers site", () => {
    expect(manifest.format).toBe("page");
    expect(page).toContain("<title>Cells");
  });
  it("carries an example note that works on its own (making-visualizers.md, rung 0)", () => {
    expect(example).toMatch(/^---\ntitle: /);
    expect((example.match(/^## /gm) || []).length).toBeGreaterThanOrEqual(2);
    expect(example).toMatch(/^\s+- ".+" \(.+\)$/m);
    expect(example).toMatch(/^\s+- comment: /m);
    expect(example).toMatch(/^\s+- tied to: /m);
  });
  it("speaks the three messages a host uses, and replies only to its host", () => {
    for (const m of ["bloob-ready", "bloob-note", "bloob-note-changed"]) expect(page).toContain(m);
    expect(page).toContain("parent.postMessage({type:'bloob-note-changed', md: toMarkdown()}, hostOrigin)");
    expect(page).not.toMatch(/bloob-note-changed[^\n]*'\*'\)/);
  });
  it("reads a note from its address", () => {
    expect(page).toContain("new URLSearchParams(location.search).get('note')");
  });
  it("draws note words as text, never as markup", () => {
    // the reading strip and the screen-reader list take words through textContent or esc()
    expect(page).toContain("readTxt.textContent = txt");
    expect(page).toContain("${esc(words)}");
  });
});
