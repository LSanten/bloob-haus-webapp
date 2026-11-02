/**
 * Every starter note in the editor must actually be drawn by its visualizer.
 * A note the shape's parser rejects would sit in the editor as raw text, and
 * nobody would notice until they opened that visualizer.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createNoteRenderer } from "../../lib/visualizer-editor/render-note.js";
import { liveVisualizers } from "../../scripts/build-visualizer-editor.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXAMPLES = path.join(ROOT, "lib/visualizer-editor/examples");
const catalog = JSON.parse(readFileSync(path.join(ROOT, "lib/visualizer-editor/catalog.json"), "utf-8"));
const names = readdirSync(EXAMPLES)
  .filter((f) => f.endsWith(".md") && f !== "always-on.md")
  .map((f) => f.slice(0, -3));
const load = async (name) => ({ name, ...(await import(path.join(ROOT, "lib/visualizers", name, "index.js"))) });

describe("starter notes", () => {
  it("exist", () => expect(names.length).toBeGreaterThan(5));

  it.each(names)("%s is drawn by its own visualizer", async (name) => {
    const shape = await import(path.join(ROOT, "lib/visualizers", name, "index.js"));
    const render = createNoteRenderer({ visualizers: [{ name, ...shape }] });
    const html = render(readFileSync(path.join(EXAMPLES, `${name}.md`), "utf-8"));
    // Untransformed blocks keep their raw text attribute or their code fence.
    expect(html).not.toContain("data-vis-raw");
    expect(html).not.toContain(`language-${name}`);
  });

  it("only the writing rules and the listed visualizers get a page", async () => {
    const { pages } = await liveVisualizers();
    expect(pages.map((p) => p.name).sort()).toEqual(["always-on", ...catalog.listed].sort());
  });

  it("the always-on page uses every always-on rule", async () => {
    const visualizers = await Promise.all(catalog.alwaysOn.visualizers.map(load));
    const html = createNoteRenderer({ visualizers })(readFileSync(path.join(EXAMPLES, "always-on.md"), "utf-8"));
    expect(html).toContain("<details"); // foldable
    expect(html).toContain('type="checkbox"'); // checkbox-tracker
    expect(html).toContain('class="footnote-ref"'); // citations
  });
});
