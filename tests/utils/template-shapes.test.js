import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {
  loadTemplateShapes,
  themeSupportsObjects,
  templateShapeLayout,
  generatedLayout,
  writeTemplateShapeLayouts,
} from "../../scripts/utils/template-shapes.js";

let root;
beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "template-shapes-"));
  const vis = path.join(root, "lib/visualizers");
  await fs.outputJson(path.join(vis, "note/manifest.json"), { name: "note", format: "template", opens: "click" });
  await fs.outputFile(path.join(vis, "note/open.html"), "<div>{{ body }}</div>");
  await fs.outputJson(path.join(vis, "article/manifest.json"), { name: "article", format: "template", defaultLayout: "layouts/article.njk" });
  await fs.outputFile(path.join(vis, "article/open.html"), "<article>{{ body }}</article>");
  await fs.outputFile(path.join(vis, "article/closed.html"), "<h2>{{ title }}</h2>");
  await fs.outputFile(path.join(vis, "article/layout.njk"), "---\nlayout: layouts/base.njk\n---\n");
  await fs.outputJson(path.join(vis, "collection/manifest.json"), { name: "collection", type: "hybrid" });
  await fs.outputFile(path.join(root, "themes/with-objects/theme.yaml"), "name: with-objects\nobjects: true\n");
  await fs.outputFile(path.join(root, "themes/plain/theme.yaml"), "name: plain\n");
  await fs.ensureDir(path.join(root, "themes/no-yaml"));
});
afterAll(() => fs.remove(root));

describe("loadTemplateShapes", () => {
  it("finds only shapes whose manifest says format: template", async () => {
    const shapes = await loadTemplateShapes(path.join(root, "lib/visualizers"));
    expect([...shapes.keys()].sort()).toEqual(["article", "note"]);
  });

  it("reads open.html, closed.html when there is one, and whether the shape has its own layout", async () => {
    const shapes = await loadTemplateShapes(path.join(root, "lib/visualizers"));
    expect(shapes.get("note").templates).toEqual({ open: "<div>{{ body }}</div>" });
    expect(shapes.get("article").templates.closed).toBe("<h2>{{ title }}</h2>");
    expect(shapes.get("note").hasOwnLayout).toBe(false);
    expect(shapes.get("article").hasOwnLayout).toBe(true);
  });
});

describe("themeSupportsObjects", () => {
  it("is true only when theme.yaml says objects: true", () => {
    expect(themeSupportsObjects({ theme: "with-objects" }, root)).toBe(true);
    expect(themeSupportsObjects({ theme: "plain" }, root)).toBe(false);
    expect(themeSupportsObjects({ theme: "no-yaml" }, root)).toBe(false);
  });
});

describe("templateShapeLayout", () => {
  const note = { name: "note", manifest: { name: "note" }, hasOwnLayout: false };
  const article = { name: "article", manifest: { defaultLayout: "layouts/article.njk" }, hasOwnLayout: true };

  it("a shape without its own layout is ignored on a theme without objects", () => {
    expect(templateShapeLayout(note, { objects: false })).toBeNull();
  });

  it("a shape without its own layout gets the generated one on a theme with objects", () => {
    expect(templateShapeLayout(note, { objects: true })).toBe("layouts/note.njk");
  });

  it("a shape with its own layout keeps it on every theme", () => {
    expect(templateShapeLayout(article, { objects: false })).toBe("layouts/article.njk");
  });
});

describe("generated layouts", () => {
  it("wraps the page in base.njk and draws the object through the engine", () => {
    const text = generatedLayout("note");
    expect(text).toContain("layout: layouts/base.njk");
    expect(text).toContain('{% bloobObject "note", content %}');
  });

  it("are written only for themes with objects, and never for shapes with their own layout", async () => {
    const shapes = await loadTemplateShapes(path.join(root, "lib/visualizers"));
    const dir = path.join(root, "out-layouts");
    expect(await writeTemplateShapeLayouts(shapes, { objects: false, layoutsDir: dir })).toEqual([]);
    expect(await writeTemplateShapeLayouts(shapes, { objects: true, layoutsDir: dir })).toEqual(["note.njk"]);
    expect(await fs.readFile(path.join(dir, "note.njk"), "utf-8")).toContain("bloobObject");
  });
});
