/**
 * Visitor-count precedence.
 *
 * Three switches decide whether a number can appear, and getting the order wrong is
 * the kind of bug that only shows up on one page of a live site:
 *
 *   1. a GoatCounter site code must be derivable from the tracking snippet
 *   2. the vault's `show_visitor_count` is the site-wide default (off)
 *   3. a note's own `visitor_count` frontmatter overrides that default, both ways
 *
 * A fourth switch — "allow using the visitor counter" in GoatCounter's own settings —
 * lives outside this repo and is handled at runtime: the endpoint answers 403 and the
 * element stays hidden. That path is covered by the browser check, not here.
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARTIAL = fs.readFileSync(
  path.join(__dirname, "../themes/_base/partials/visitor-count.njk"),
  "utf-8",
);

/** Renders the partial and says whether the widget was emitted at all. */
function render({ code = "melt", siteDefault = false, pageValue } = {}) {
  const ctx = {
    site: { analytics: { goatcounter_code: code, show_visitor_count: siteDefault } },
  };
  if (pageValue !== undefined) ctx.visitor_count = pageValue;
  const html = nunjucks.renderString(PARTIAL, ctx);
  return { rendered: html.includes("visitor-count"), html };
}

describe("visitor count — site-wide default", () => {
  it("is off when the vault has not opted in", () => {
    expect(render({ siteDefault: false }).rendered).toBe(false);
  });

  it("is on when the vault opted in", () => {
    expect(render({ siteDefault: true }).rendered).toBe(true);
  });

  it("stays off with no GoatCounter code, however loudly the vault opts in", () => {
    expect(render({ code: null, siteDefault: true }).rendered).toBe(false);
  });
});

describe("visitor count — a note's frontmatter overrides the site default", () => {
  it("visitor_count: false hides it on a site that shows it everywhere else", () => {
    expect(render({ siteDefault: true, pageValue: false }).rendered).toBe(false);
  });

  it("visitor_count: true shows it on a site that is otherwise off", () => {
    expect(render({ siteDefault: false, pageValue: true }).rendered).toBe(true);
  });

  it("cannot conjure a counter when the site has no GoatCounter code", () => {
    expect(render({ code: null, siteDefault: false, pageValue: true }).rendered).toBe(false);
  });
});

describe("visitor count — rendered markup", () => {
  const { html } = render({ siteDefault: true });

  it("starts hidden, so a 403 from GoatCounter shows nothing rather than an empty pill", () => {
    expect(html).toMatch(/class="visitor-count"[^>]*\shidden/);
  });

  it("carries the derived site code for the runtime fetch", () => {
    expect(html).toContain('data-goatcounter-code="melt"');
  });

  it("ships no GoatCounter image or iframe badge", () => {
    expect(html).not.toMatch(/<img|<iframe/i);
  });

  it("is excluded from search indexing", () => {
    expect(html).toContain("data-pagefind-ignore");
  });
});
