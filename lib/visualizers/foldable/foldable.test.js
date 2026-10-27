/**
 * Foldable: `## > Heading` folds, `## ^ Heading` opens, and nothing else moves.
 *
 * The markdown-it instance is configured the way eleventy.config.js configures
 * the real one (container, attrs, footnotes, breaks), because most of the risk
 * is in how the fold rule meets those plugins, not in the rule alone.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import MarkdownIt from "markdown-it";
import markdownItContainer from "markdown-it-container";
import markdownItAttrs from "markdown-it-attrs";
import markdownItFootnote from "markdown-it-footnote";

import { parseFoldMarker, findFolds, foldHeadingsPlugin } from "./fold-headings.js";
import { addFoldPeeks, collectCardImages, MAX_PEEKS } from "./peek.js";
import * as foldable from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeMd({ enabled = true } = {}) {
  const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
  md.use(markdownItFootnote);
  md.use(markdownItAttrs);
  md.use(markdownItContainer, "section", {
    validate: () => true,
    render(tokens, idx) {
      if (tokens[idx].nesting !== 1) return `</section>\n`;
      return `<section class="${tokens[idx].info.trim().split(" ")[0]}">\n`;
    },
  });
  md.use(foldHeadingsPlugin, { enabled });
  return md;
}

const render = (src, opts) => makeMd(opts).render(src);

/** Text of every <summary>, in order. */
const summaries = (html) => [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => m[1]);

describe("parseFoldMarker", () => {
  it.each([
    ["> Title", false, "Title"],
    [">Title", false, "Title"],
    [">   Title", false, "Title"],
    ["^ Title", true, "Title"],
    ["^Title", true, "Title"],
  ])("%j is a fold (open=%s)", (text, open, rest) => {
    expect(parseFoldMarker(text)).toEqual({ open, rest });
  });

  it.each(["Title", "A > B", "\\> escaped", ">", "> ", "", null])("%j is not a fold", (text) => {
    expect(parseFoldMarker(text)).toBeNull();
  });
});

describe("fold rendering", () => {
  it("`## > Title` renders folded, marker removed", () => {
    const html = render("## > Recent marbles\n\nSome text.\n");
    expect(html).toContain('<details class="bloob-fold" data-fold-level="2">');
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html).toContain("<h2>Recent marbles</h2>");
    expect(html).not.toContain("&gt;");
    expect(html).toMatch(/<div class="bloob-fold__body">\s*<p>Some text\.<\/p>\s*<\/div>\s*<\/details>/);
  });

  it("works without the space: `## >Title` (MMSHomepage style)", () => {
    const html = render("## >Some recent marbles close to my heart\ntext\n");
    expect(html).toContain("<h2>Some recent marbles close to my heart</h2>");
    expect(html).toContain('class="bloob-fold"');
  });

  it("`## ^ Title` renders open but foldable", () => {
    const html = render("## ^ Sensor Specifications\n\nSpecs.\n");
    expect(html).toContain('<details class="bloob-fold" data-fold-level="2" open>');
    expect(html).toContain("<h2>Sensor Specifications</h2>");
  });

  it("keeps inline markup in the title", () => {
    const html = render("### > **The General Arc**\n\nArc.\n");
    expect(html).toContain("<h3><strong>The General Arc</strong></h3>");
  });

  it("keeps a markdown-it-attrs id on the heading", () => {
    const html = render("## > Last {#last-id}\n\ntext\n");
    expect(html).toContain('<h2 id="last-id">Last</h2>');
  });

  it("a section ends at the next heading of the same level", () => {
    const html = render("## > A\n\na text\n\n## B\n\nb text\n");
    expect(html).toMatch(/a text<\/p>\s*<\/div>\s*<\/details>\s*<h2>B<\/h2>/);
  });

  it("a section ends at a higher-level heading", () => {
    const html = render("### > A\n\na text\n\n## B\n\nb text\n");
    expect(html).toMatch(/a text<\/p>\s*<\/div>\s*<\/details>\s*<h2>B<\/h2>/);
  });

  it("a lower-level heading stays inside the section", () => {
    const html = render("## > A\n\n### Sub\n\nsub text\n\n## C\n");
    const body = html.slice(html.indexOf("bloob-fold__body"), html.indexOf("</details>"));
    expect(body).toContain("<h3>Sub</h3>");
    expect(body).toContain("sub text");
    expect(html).toMatch(/<\/details>\s*<h2>C<\/h2>/);
  });

  it("folds nest, inner closing before outer", () => {
    const html = render("## > Outer\n\no\n\n### > Inner\n\ni\n\n## After\n");
    expect(summaries(html).map((s) => s.replace(/<span[\s\S]*$/, "").trim())).toEqual([
      "<h2>Outer</h2>",
      "<h3>Inner</h3>",
    ]);
    expect(html).toMatch(/<p>i<\/p>\s*<\/div>\s*<\/details>\s*<\/div>\s*<\/details>\s*<h2>After<\/h2>/);
  });

  it("YOGA-SEQUENCE shape: h2 fold holding h3 and h4 folds", () => {
    const src = [
      "## > **All Postures divided into sections**",
      "### > Grounding",
      "g",
      "### > Sun Salutations (Warm Ups)",
      "#### > Sun Salutation A",
      "a",
      "#### > Sun Salutation B",
      "b",
      "### > Standing Postures",
      "s",
    ].join("\n");
    const folds = findFolds(makeMd({ enabled: false }).parse(src, {}));
    expect(folds.map((f) => f.hLevel)).toEqual([2, 3, 3, 4, 4, 3]);
    const html = render(src);
    expect((html.match(/<details/g) || []).length).toBe(6);
    expect((html.match(/<\/details>/g) || []).length).toBe(6);
  });

  it("a fold runs to the end of the page", () => {
    const html = render("Intro\n\n## > Transcript\n\nline one\n\nline two\n");
    expect(html.trim().endsWith("</details>")).toBe(true);
    expect(html).toMatch(/line two<\/p>\s*<\/div>\s*<\/details>\s*$/);
  });

  it("never swallows the footnotes block", () => {
    const html = render("## > Notes\n\nA claim.[^1]\n\n[^1]: The source.\n");
    expect(html.indexOf("</details>")).toBeLessThan(html.indexOf('class="footnotes"'));
    expect(html).toContain('class="footnote-ref"');
  });

  it("a marked heading with nothing under it is a plain heading", () => {
    const html = render("## > Empty\n## > Full\n\ntext\n");
    expect(html).toMatch(/^<h2>Empty<\/h2>/);
    expect(html).toContain('<summary class="bloob-fold__summary"><h2>Full</h2>');
    expect((html.match(/<details/g) || []).length).toBe(1);
  });

  it("stays inside a ::: block and closes with it", () => {
    const html = render("::: bg-dark\n## > Inside\n\nin\n:::\n\nafter\n");
    expect(html).toMatch(/<section class="bg-dark">\s*<details[\s\S]*<\/details>\s*<\/section>\s*<p>after<\/p>/);
  });

  it("a fold contains a ::: block (a collection) whole", () => {
    const html = render("## > Recent\n\n:::collection\n- [A](/a/)\n:::\n\n## Next\n");
    expect(html).toMatch(/<div class="bloob-fold__body">\s*<section class="collection">[\s\S]*<\/section>\s*<\/div>\s*<\/details>\s*<h2>Next<\/h2>/);
  });

  it("a heading inside a blockquote folds only within the quote", () => {
    const html = render("## > Outer\n\n> ## > Quoted\n> q text\n\nstill outer\n");
    expect(html).toMatch(/<blockquote>\s*<details[\s\S]*q text[\s\S]*<\/details>\s*<\/blockquote>\s*<p>still outer<\/p>\s*<\/div>\s*<\/details>/);
  });
});

describe("nothing else changes", () => {
  it("blockquote lines (`> text`) are untouched", () => {
    const src = ">Let the breath arrive\nlike rain\n\n> quoted\n";
    expect(render(src)).toBe(render(src, { enabled: false }));
    expect(render(src)).not.toContain("bloob-fold");
  });

  it("headings with `>` elsewhere are untouched", () => {
    const src = "## A > B\n\n## Input -> output\n\ntext\n";
    expect(render(src)).toBe(render(src, { enabled: false }));
  });

  it("an escaped marker is a literal `>`", () => {
    const html = render("## \\> not a fold\n\ntext\n");
    expect(html).toContain("<h2>&gt; not a fold</h2>");
    expect(html).not.toContain("bloob-fold");
  });

  it("`## >` inside a code block is code", () => {
    const src = "```\n## > not a fold\n```\n";
    expect(render(src)).toBe(render(src, { enabled: false }));
  });

  it("a page without markers renders byte-identically", () => {
    const src = "# Title\n\n## Normal\n\ntext [link](/x/)\n\n- a\n- b\n\n> quote\n\n::: image-grid\n| a |\n:::\n";
    expect(render(src)).toBe(render(src, { enabled: false }));
  });

  it("`enabled: false` (features.foldable_headings: false) leaves markers as text", () => {
    const html = render("## > Title\n\ntext\n", { enabled: false });
    expect(html).toContain("<h2>&gt; Title</h2>");
  });
});

describe("index.js wiring", () => {
  it("exports a markdown-it plugin that honours the site opt-out", () => {
    const on = new MarkdownIt().use(foldable.markdownItPlugin, { siteConfig: { features: {} } });
    const off = new MarkdownIt().use(foldable.markdownItPlugin, {
      siteConfig: { features: { foldable_headings: false } },
    });
    expect(on.render("## > T\n\nx\n")).toContain("bloob-fold");
    expect(off.render("## > T\n\nx\n")).not.toContain("bloob-fold");
  });

  it("runs its transform after the other shapes (it reads their cards)", () => {
    expect(foldable.transformOrder).toBeGreaterThan(0);
    expect(typeof foldable.transform).toBe("function");
  });

  it("manifest detects its own markup for per-page loading", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8"));
    expect(manifest.name).toBe("foldable");
    expect(manifest.detect.selectors).toContain(".bloob-fold");
    for (const f of ["styles.css", "browser.js", "schema.md"]) {
      expect(fs.existsSync(path.join(__dirname, f)), f).toBe(true);
    }
  });
});

describe("peek circles", () => {
  const card = (src) =>
    `<a class="fp-card" href="/x/"><div class="fp-card__image-wrap"><img class="no-pswp" src="${src}" alt="" loading="lazy"></div></a>`;
  const placeholderCard = `<a class="fp-card"><div class="fp-card__image-wrap fp-card__image-wrap--placeholder"><img class="fp-card__placeholder-icon" src="/favicon.png" alt=""></div></a>`;

  it("fills a closed fold's placeholder with its card images", () => {
    const html = render("## > Recent\n\nx\n").replace(
      "<p>x</p>",
      card("/og/a.png") + card("/og/b.png") + placeholderCard,
    );
    const out = addFoldPeeks(html);
    expect(out).toContain('<span class="bloob-fold__peek" aria-hidden="true"><img class="bloob-fold__peek-img no-pswp" src="/og/a.png"');
    expect(out).toContain('src="/og/b.png" alt="" loading="lazy" decoding="async"></span>');
    expect(out).not.toMatch(/bloob-fold__peek-img[^>]*favicon/);
  });

  it("an outer fold also peeks at cards in its nested folds; each fold gets its own row", () => {
    let html = render("## > Outer\n\nO\n\n### > Inner\n\nI\n");
    html = html.replace("<p>O</p>", card("/og/o.png")).replace("<p>I</p>", card("/og/i.png"));
    const out = addFoldPeeks(html);
    const rows = [...out.matchAll(/<span class="bloob-fold__peek" aria-hidden="true">([\s\S]*?)<\/span>/g)].map((m) => m[1]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("/og/o.png");
    expect(rows[0]).toContain("/og/i.png");
    expect(rows[1]).toContain("/og/i.png");
    expect(rows[1]).not.toContain("/og/o.png");
  });

  it("drops the placeholder when a fold holds no cards", () => {
    const out = addFoldPeeks(render("## > Plain\n\njust text\n"));
    expect(out).not.toContain("bloob-fold__peek");
    expect(out).toContain("just text");
  });

  it("caps the row and skips repeats", () => {
    const many = Array.from({ length: 10 }, (_, i) => card(`/og/${i}.png`)).join("") + card("/og/0.png");
    expect(collectCardImages(many)).toHaveLength(MAX_PEEKS);
    expect(collectCardImages(card("/og/a.png") + card("/og/a.png"))).toEqual(["/og/a.png"]);
  });

  it("leaves pages without folds untouched", () => {
    const html = `<p>no folds</p>${card("/og/a.png")}`;
    expect(addFoldPeeks(html)).toBe(html);
  });
});
