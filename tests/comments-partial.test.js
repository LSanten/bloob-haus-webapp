/**
 * Comments precedence — the article shape's comment section.
 *
 * The rule, in the order it is decided:
 *   1. the vault must have a `fast-comments-embed` fence; without one, no page
 *      anywhere shows comments (a site that never configured them gets nothing)
 *   2. given that, comments are ON by default — an article is a thing you comment on
 *   3. a note's `comments: false` frontmatter turns them off for that note alone
 *
 * The `article` shape opts in by including this partial in its layout.njk; a shape
 * opts out by not including it (see docs/architecture/shapes.md, "Comments — a shape
 * behavior"). This file guards the partial's own logic, plus the fact that `article`
 * still includes it — that include is one deletion away from silently disappearing.
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf-8");
const PARTIAL = read("themes/_base/partials/comments.njk");

const SNIPPET = '<div id="fastcomments-widget"></div>';

/** Renders the partial; reports whether a comment section was emitted. */
function render({ configured = true, pageValue } = {}) {
  const ctx = {
    site: { embeds: configured ? { "fast-comments-embed": SNIPPET } : {}, url: "https://melt.bloob.haus" },
    page: { url: "/about-melt/" },
    title: "About MELT",
    bloobPageId: "melt.bloob.haus/about-melt",
  };
  if (pageValue !== undefined) ctx.comments = pageValue;
  // injectPageVars is an Eleventy filter; the partial only uses it to substitute
  // {{ page_id }} tokens, which is not what this test is about.
  const env = new nunjucks.Environment(null, { autoescape: false });
  env.addFilter("injectPageVars", (s) => s);
  const html = env.renderString(PARTIAL, ctx);
  return { rendered: html.includes("bloob-comments"), html };
}

describe("comments — vault configuration gates everything", () => {
  it("renders nothing when the vault has no fast-comments-embed fence", () => {
    expect(render({ configured: false }).rendered).toBe(false);
  });

  it("renders nothing even if a note explicitly asks for comments", () => {
    expect(render({ configured: false, pageValue: true }).rendered).toBe(false);
  });
});

describe("comments — on by default once configured", () => {
  it("shows on a page that says nothing about comments", () => {
    expect(render().rendered).toBe(true);
  });

  it("is suppressed by comments: false on that page alone", () => {
    expect(render({ pageValue: false }).rendered).toBe(false);
  });

  it("stays on for comments: true", () => {
    expect(render({ pageValue: true }).rendered).toBe(true);
  });
});

describe("comments — the article shape opts in", () => {
  const layout = read("lib/visualizers/article/layout.njk");

  it("includes the comments partial", () => {
    expect(layout).toContain('include "partials/comments.njk"');
  });

  it("places it after the body, outside <article> so it is not indexed", () => {
    expect(layout.indexOf("</article>")).toBeLessThan(layout.indexOf('partials/comments.njk'));
  });

  it("marks the section data-pagefind-ignore", () => {
    expect(PARTIAL).toContain("data-pagefind-ignore");
  });
});
