/**
 * Folder-index template resolution + substitution.
 *
 * The generated folder-index body used to be a hard-coded HTML string in
 * preprocess-content.js containing folder-preview's container div. It is now a
 * markdown template that composes a shape, resolved theme-first.
 *
 * The substitution rules here are load-bearing rather than cosmetic: a
 * placeholder that silently resolved to an empty string would produce
 * `source: folder=` and render an EMPTY folder index with no error — the exact
 * silent-failure mode this module exists to prevent.
 */

import { describe, it, expect } from "vitest";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import {
  resolveFolderIndexTemplate,
  renderFolderIndexTemplate,
  folderDisplayName,
  TEMPLATE_NAME,
} from "../../scripts/utils/folder-index-template.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const THEMES = path.join(ROOT, "themes");

describe("resolveFolderIndexTemplate", () => {
  it("falls back to _base when the theme has no override", () => {
    const p = resolveFolderIndexTemplate(THEMES, "alter-engineers");
    expect(p).toBe(path.join(THEMES, "_base", "templates", TEMPLATE_NAME));
  });

  it("falls back to _base for an unknown theme rather than throwing", () => {
    const p = resolveFolderIndexTemplate(THEMES, "no-such-theme");
    expect(p).toBe(path.join(THEMES, "_base", "templates", TEMPLATE_NAME));
  });

  it("returns null when neither theme nor _base has one", () => {
    expect(resolveFolderIndexTemplate(path.join(ROOT, "does-not-exist"), "melt")).toBeNull();
  });

  it("prefers a theme override when one exists", () => {
    // Proven against a temp themes dir so the test does not depend on which
    // themes happen to ship an override today.
    const tmp = path.join(ROOT, ".tmp-themes-test");
    try {
      fs.outputFileSync(path.join(tmp, "_base", "templates", TEMPLATE_NAME), "base");
      fs.outputFileSync(path.join(tmp, "melt", "templates", TEMPLATE_NAME), "theme");
      expect(resolveFolderIndexTemplate(tmp, "melt")).toBe(
        path.join(tmp, "melt", "templates", TEMPLATE_NAME),
      );
      expect(resolveFolderIndexTemplate(tmp, "marbles-pouch")).toBe(
        path.join(tmp, "_base", "templates", TEMPLATE_NAME),
      );
    } finally {
      fs.removeSync(tmp);
    }
  });
});

describe("renderFolderIndexTemplate", () => {
  it("substitutes with or without inner whitespace", () => {
    expect(renderFolderIndexTemplate("a {{ slug }} b {{slug}} c", { slug: "projects" })).toBe(
      "a projects b projects c",
    );
  });

  it("leaves an unknown placeholder visible instead of blanking it", () => {
    // A blanked placeholder becomes `source: folder=` — an empty index with no
    // error. A visible {{ typo }} is diagnosable.
    expect(renderFolderIndexTemplate("x {{ typo }} y", { slug: "s" })).toBe("x {{ typo }} y");
  });

  it("substitutes every placeholder in the real _base template", () => {
    const tpl = fs.readFileSync(
      path.join(THEMES, "_base", "templates", TEMPLATE_NAME),
      "utf-8",
    );
    const out = renderFolderIndexTemplate(tpl, {
      slug: "case-studies",
      folder_display: "Case Studies",
    });
    expect(out).not.toMatch(/\{\{/);
    expect(out).toContain("permalink: /case-studies/");
    expect(out).toContain("source: folder=case-studies");
    expect(out).toContain("title: Case Studies");
  });
});

describe("the shipped _base template", () => {
  const tpl = fs.readFileSync(path.join(THEMES, "_base", "templates", TEMPLATE_NAME), "utf-8");

  it("composes a shape rather than hard-coding markup", () => {
    expect(tpl).toContain("```collection");
    expect(tpl).not.toMatch(/<div[^>]*visualizer/);
  });

  it("is an article containing a collection, matching authored _index.md files", () => {
    expect(tpl).toContain("bloob-shape: article");
    expect(tpl).toContain("layout: layouts/article.njk");
  });

  it("carries the frontmatter Step 6 would otherwise inject, since stubs bypass it", () => {
    for (const key of ["permalink:", "folder:", "title:", "folder_display:"]) {
      expect(tpl).toContain(key);
    }
  });

  it("uses the slug, never a raw folder name, in the collection source", () => {
    // graph.json's `section` is slugified; folder=Resources matches nothing.
    expect(tpl).toContain("source: folder={{ slug }}");
  });
});

describe("folderDisplayName", () => {
  it("title-cases slug separators", () => {
    expect(folderDisplayName("case-studies")).toBe("Case Studies");
    expect(folderDisplayName("clients")).toBe("Clients");
    expect(folderDisplayName("some_mixed-name")).toBe("Some Mixed Name");
  });
});
