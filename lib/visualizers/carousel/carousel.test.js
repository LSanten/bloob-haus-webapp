import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "./parser.js";
import { render } from "./renderer.js";
import { transform, extractMedia } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const b64 = (s) => Buffer.from(s, "utf-8").toString("base64");

describe("carousel parser", () => {
  it("pairs each image with the text line under it", () => {
    const { items } = parse(
      "![](/media/Theater.jpg)\nThe Grand Ballroom.\n\n![](/media/New%20heat%20pumps.jpg)\nHeat pumps on the roof.",
    );
    expect(items).toEqual([
      { src: "/media/Theater.jpg", alt: "", caption: "The Grand Ballroom." },
      { src: "/media/New%20heat%20pumps.jpg", alt: "", caption: "Heat pumps on the roof." },
    ]);
  });

  it("allows slides without captions, back to back or separated by blank lines", () => {
    const { items } = parse("![](/media/a.png)\n![](/media/b.png)\n\n![](/media/c.png)");
    expect(items.map((i) => i.caption)).toEqual(["", "", ""]);
    expect(items).toHaveLength(3);
  });

  it("joins a caption that wraps over several lines, and stops at a blank line", () => {
    const { items } = parse("![](/media/a.jpg)\nFirst line\nsecond line\n\nstray text\n![](/media/b.jpg)");
    expect(items[0].caption).toBe("First line second line");
    expect(items[1].caption).toBe("");
  });

  it("reads Obsidian wikilink images and ignores a |width pipe", () => {
    const { items } = parse("![[Theater.jpg|400]]\nCaption\n![[logo.png|Our logo]]");
    expect(items[0]).toEqual({ src: "Theater.jpg", alt: "", caption: "Caption" });
    expect(items[1].alt).toBe("Our logo");
  });

  it("never treats a 'Key: value' caption as a setting", () => {
    const { items } = parse("![](/media/a.jpg)\nNote: the original boilers.");
    expect(items[0].caption).toBe("Note: the original boilers.");
  });

  it("ignores text before the first image and handles CRLF", () => {
    const { items } = parse("Intro words\r\n![](/media/a.jpg)\r\nCap\r\n");
    expect(items).toEqual([{ src: "/media/a.jpg", alt: "", caption: "Cap" }]);
  });
});

describe("carousel renderer", () => {
  const data = parse("![](/media/a.jpg)\nFirst <b>caption</b>\n![](/media/b.jpg)");

  it("renders every slide as real markup, captions only where given", () => {
    const html = render(data);
    expect(html.match(/<figure class="carousel__slide"/g)).toHaveLength(2);
    expect(html.match(/<figcaption/g)).toHaveLength(1);
    expect(html).toContain('<img src="/media/a.jpg"');
    expect(html).toContain("First &lt;b&gt;caption&lt;/b&gt;");
    expect(html).toContain('aria-label="1 of 2"');
  });

  it("ships controls hidden so a page without script shows no dead buttons", () => {
    expect(render(data)).toMatch(/<div class="carousel__controls" hidden>/);
    expect(render(parse("![](/media/a.jpg)"))).not.toContain("carousel__controls");
  });

  it("uses injected media markup when given (optimized images)", () => {
    const media = ['<a class="pswp-gallery__item" href="/media/a.jpg"><picture>A</picture></a>', null];
    const html = render(data, {}, { media });
    expect(html).toContain("<picture>A</picture>");
    expect(html).toContain('<img src="/media/b.jpg"'); // fallback for the missing entry
  });

  it("validates settings", () => {
    expect(render(data, { fit: "cover", ratio: "4/3" })).toMatch(/carousel--fit-cover[^>]*style="--carousel-ratio: 4\/3"/);
    const bad = render(data, { fit: "explode", ratio: "url(x)" });
    expect(bad).toContain("carousel--fit-contain");
    expect(bad).not.toContain("--carousel-ratio");
  });

  it("returns nothing for no images", () => {
    expect(render({ items: [] })).toBe("");
  });
  it("loop=true adds copies of the last two before and the first two after", () => {
    const four = parse(["a", "b", "c", "d"].map((x) => `![](/m/${x}.jpg)`).join("\n"));
    const html = render(four, { loop: "true" }, { media: ['<a class="pswp-gallery__item" href="/m/a.jpg"><img src="/m/a.jpg"></a>'] });
    const idx = [...html.matchAll(/data-index="(\d)"( data-clone)?/g)].map((m) => m[1] + (m[2] ? "c" : ""));
    expect(idx).toEqual(["2c", "3c", "0", "1", "2", "3", "0c", "1c"]);
    expect(html).toContain("data-loop");
    // copies: hidden from screen readers, out of the tab order, not in the lightbox gallery
    expect(html.match(/pswp-gallery__item/g)).toHaveLength(1);
    expect(html).toContain('<a tabindex="-1" class="carousel__clone-link"');
    expect(html).not.toContain(" inert");
  });

  it("loop is ignored for one or two photos and for unknown values", () => {
    expect(render(parse("![](/a.jpg)\n![](/b.jpg)"), { loop: "true" })).not.toContain("data-clone");
    expect(render(data, { loop: "maybe" })).not.toContain("data-loop");
    expect(render(parse("![](/a.jpg)\n![](/b.jpg)\n![](/c.jpg)"), { loop: "infinite" })).toContain("data-loop");
  });
});

describe("carousel transform", () => {
  const raw = "![](/media/a.jpg)\nCaption A\n\n![](/media/b.png)";
  const optimizedA = '<a class="pswp-gallery__item" href="/media/a.jpg" data-pswp-src="/media/optimized/a-1200w.webp"><picture><source type="image/webp" srcset="/media/optimized/a-600w.webp 600w"><img alt="" src="/media/optimized/a-600w.png"></picture></a>';
  const optimizedB = '<a class="pswp-gallery__item" href="/media/b.png"><picture><source type="image/webp" srcset="/media/optimized/b-600w.webp 600w"><img alt="" src="/media/optimized/b-600w.png"></picture></a>';

  it("replaces the section and keeps the optimizer's resized images, in order", () => {
    const page = `<p>before</p><section class="carousel" data-vis-settings='{"fit":"cover"}' data-vis-raw="${b64(raw)}">\n<p>${optimizedA}\nCaption A</p>\n<p>${optimizedB}</p>\n</section><p>after</p>`;
    const out = transform(page);
    expect(out).toContain("data-carousel");
    expect(out).toContain("carousel--fit-cover");
    expect(out).toContain("/media/optimized/a-600w.webp");
    expect(out).toContain("/media/optimized/b-600w.webp");
    expect(out).not.toContain('<img src="/media/a.jpg"'); // the multi-MB original is never the slide image
    expect(out.indexOf("a-600w")).toBeLessThan(out.indexOf("b-600w"));
    expect(out).toMatch(/^<p>before<\/p>[\s\S]*<p>after<\/p>$/);
  });

  it("falls back to plain images when the rendered markup doesn't match the slide count", () => {
    const page = `<section class="carousel" data-vis-raw="${b64(raw)}"><p>${optimizedA}</p></section>`;
    const out = transform(page);
    expect(out).toContain('<img src="/media/a.jpg"');
    expect(out).toContain('<img src="/media/b.png"');
  });

  it("leaves a section without raw data alone", () => {
    const page = '<section class="carousel"><p>x</p></section>';
    expect(transform(page)).toBe(page);
  });

  it("extractMedia finds anchors, bare pictures and bare imgs", () => {
    const html = `${optimizedA}<picture><img src="/x.png"></picture><img src="/y.png">`;
    expect(extractMedia(html)).toHaveLength(3);
  });
});

describe("carousel package", () => {
  it("declares a detect selector for the class its stylesheet owns", () => {
    const manifest = JSON.parse(readFileSync(join(here, "manifest.json"), "utf-8"));
    expect(manifest.name).toBe("carousel");
    expect(manifest.trigger).toBe("carousel");
    expect(manifest.detect.selectors).toContain(".carousel");
  });

  it("styles.css uses theme tokens, never hex colors or font names", () => {
    const css = readFileSync(join(here, "styles.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/font-family:\s*['"]/);
  });

  it("browser.js never builds slide markup", () => {
    const js = readFileSync(join(here, "browser.js"), "utf-8");
    expect(js).not.toMatch(/innerHTML|createElement|insertAdjacentHTML/);
  });
});
