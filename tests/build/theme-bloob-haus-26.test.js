import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const THEME = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../themes/bloob-haus-26");
const read = (f) => readFileSync(path.join(THEME, f), "utf-8");

describe("bloob-haus-26", () => {
  it.each(["layouts/base.njk", "layouts/page.njk", "layouts/folder-index.njk", "partials/head.njk", "partials/footer.njk", "partials/scripts.njk", "assets/css/main.css", "assets/objects/marble.png", "theme.yaml"])(
    "brings %s", (f) => expect(existsSync(path.join(THEME, f))).toBe(true));

  it("says it draws objects", () => expect(yaml.load(read("theme.yaml")).objects).toBe(true));

  it("prints both visualizer markers", () => {
    expect(read("partials/head.njk")).toContain("<!--bloob:visualizer-css-->");
    expect(read("partials/scripts.njk")).toContain("<!--bloob:visualizer-js-->");
  });

  it("decides how the page's object starts before any stylesheet loads", () => {
    const head = read("partials/head.njk");
    const init = head.indexOf("{% bloobHeadInit bloobPageId %}");
    expect(init).toBeGreaterThan(-1);
    expect(init).toBeLessThan(head.indexOf('rel="stylesheet"'));
  });

  it("loads the engine's toolbox and shared CSS", () => {
    expect(read("partials/head.njk")).toContain("/assets/css/bloob-engine.css");
    expect(read("partials/scripts.njk")).toContain("/assets/js/bloob-engine.js");
  });

  it("gives every token from docs/architecture/tokens.md a day and a night value", () => {
    const css = read("assets/css/main.css");
    for (const t of ["--world-1", "--world-2", "--world-3", "--world-glow", "--light-x", "--light-y", "--light-warmth", "--light-level", "--object-paper", "--object-ink", "--object-shadow", "--dot-color", "--dot-warm", "--grain-strength", "--card-bg", "--surface-text-color"]) {
      const count = (css.match(new RegExp(`${t}\\s*:`, "g")) || []).length;
      expect(count, t).toBeGreaterThanOrEqual(2);
    }
    expect(css).toContain("prefers-color-scheme: dark");
  });

  it("keeps the grain under the objects and avoids the slow kinds of drawing", () => {
    // The one exception (Leon, 2026-11-02): a peek blurs the page behind it, and only while it
    // is open, so it's clear you are only peeking. Nothing that stays on screen blurs.
    const outsidePeek = read("assets/css/main.css").replace(/\.bloob-peek \{[^}]*\}/, "");
    expect(outsidePeek).not.toMatch(/filter:\s*blur/);
    expect(outsidePeek).not.toMatch(/mix-blend-mode/);
    expect(outsidePeek).not.toMatch(/backdrop-filter/);
  });
});
