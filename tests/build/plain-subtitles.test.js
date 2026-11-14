/**
 * A subtitle is written in markdown (`## A [Redwood Energy](https://...) Project` under the title).
 * The page draws it as markdown, but every place that shows it as text gets plain text: the search
 * results (pagefind's subtitle meta) and an object's outside (a closed marble, the share card).
 * Leon's feedback f75b558a: the search showed the raw link syntax.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { objectData } from "../../scripts/utils/template-shapes.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

function templatesWithSubtitleMeta() {
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(njk|md)$/.test(e.name) && readFileSync(p, "utf-8").includes('data-pagefind-meta="subtitle[content]"')) found.push(p);
    }
  };
  for (const d of ["themes", "lib/visualizers"]) if (existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d));
  return found;
}

describe("plain subtitles", () => {
  it("every search subtitle meta is the plain text of the subtitle", () => {
    const files = templatesWithSubtitleMeta();
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const metas = readFileSync(f, "utf-8").match(/data-pagefind-meta="subtitle\[content\]" content="[^"]*"/g);
      for (const m of metas) expect(m, path.relative(ROOT, f)).toContain('content="{{ subtitle | mdplain }}"');
    }
  });

  it("an object's outside gets the subtitle as plain text", () => {
    const data = objectData({ title: "Fridge magnets", subtitle: "A [Redwood Energy](https://www.redwoodenergy.net/) Project" }, { name: "marble" });
    expect(data.subtitle).toBe("A Redwood Energy Project");
    expect(data.title).toBe("Fridge magnets");
  });

  it("leaves a page without a subtitle without one", () => {
    expect(objectData({ title: "x" }, { name: "note" }).subtitle).toBeUndefined();
  });

  it("names the kind of object from what the haus says about it", () => {
    const data = objectData({ title: "x" }, { name: "marble", about: { display_name: "Marble", description: "A glass marble." } });
    expect(data.object_label).toBe("marble");
    expect(data.object_about).toBe("A glass marble.");
    expect(objectData({}, { name: "note" }).object_label).toBe("note");
  });
});
