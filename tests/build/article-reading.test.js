import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (f) => readFileSync(path.join(ROOT, f), "utf-8");

describe("one article for everyone", () => {
  it("the article layout draws its reading part from the shared partial", () => {
    expect(read("lib/visualizers/article/layout.njk")).toContain('{% include "partials/article-reading.njk" %}');
  });

  it("inside another object the share bar steps aside (the outermost object shares)", () => {
    expect(read("themes/_base/partials/article-reading.njk")).toContain("shape_settings.share_bar !== false and not inside_object");
  });

  it("inside an object the greeting replaces the type label, so they don't stack", () => {
    const partial = read("themes/_base/partials/article-reading.njk");
    expect(partial).toMatch(/inside_object %}\{% if typeData and typeData.banner_text %}<p class="article-type article-type--greeting">/);
    expect(partial).toContain("typeData.banner_text and not inside_object");
  });
});
