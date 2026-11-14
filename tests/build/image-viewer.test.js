/**
 * Every image on a page opens in the image viewer (PhotoSwipe), whatever shape it sits in, unless
 * it opts out (no-zoom, no-lightbox, no-pswp). The viewer used to bind only to <article>, so a
 * note (drawn by the engine, no <article>) sent a click straight to the image file.
 * Leon's feedback 82c8adc1. Images in a peek keep their own handler (peek.js).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (f) => readFileSync(path.join(ROOT, f), "utf-8");

describe("one image viewer for every shape", () => {
  it("the shared viewer binds to the page's <main>, not only to <article>", () => {
    const partial = read("themes/_base/partials/photoswipe-scripts.njk");
    expect(partial).toMatch(/gallery:\s*'main'/);
    expect(partial).not.toMatch(/gallery:\s*'article'/);
    expect(partial).toContain("children: 'a.pswp-gallery__item'");
  });

  it("every theme that loads the shared viewer has a <main> for it", () => {
    for (const theme of ["bloob-haus-26", "marbles-pouch", "melt"]) {
      expect(read(`themes/${theme}/partials/scripts.njk`)).toContain('include "partials/photoswipe-scripts.njk"');
      expect(read(`themes/${theme}/layouts/base.njk`)).toMatch(/<main\b/);
    }
  });

  it("a peek still makes its images bigger in place, ahead of the page's viewer", () => {
    const peek = read("lib/visualizers/_engine/peek.js");
    expect(peek).toContain('closest?.(".bloob-peek a.pswp-gallery__item")');
    expect(peek).toMatch(/stopImmediatePropagation\(\);\s*const items = \[\.\.\.overlay\.querySelectorAll\("a\.pswp-gallery__item"\)\]/);
  });
});
