/**
 * sitemap.xml + robots.txt + the robots meta tag: how a site shows up in search.
 * One switch, `features.show_in_search`: yes (sitemap) | quiet (default) | no (noindex).
 *
 * A sitemap is an invitation: it hands Google every URL in it. So two things are
 * load-bearing here, not cosmetic:
 *
 *   1. an unlisted page (visibility: unlisted, website_status: unlisted, #unlisted →
 *      `_bloob_unlisted`) must never be in it. security-by-obscurity.md lists this as a
 *      per-theme obligation; living in _base makes it everyone's, once.
 *   2. no theme quietly ships its own copy, or the site's switch
 *      (`features.show_in_search`) stops deciding anything for that theme.
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.join(__dirname, "../themes");
const BASE_PAGES = path.join(THEMES, "_base/pages");

/** Template body without its frontmatter, the way Eleventy hands it to Nunjucks. */
function body(file, dir = BASE_PAGES) {
  const text = fs.readFileSync(path.join(dir, file), "utf-8");
  return text.replace(/^---[\s\S]*?\n---\n/, "");
}

function render(file, ctx) {
  const env = new nunjucks.Environment();
  env.addFilter("dateToRfc3339", (d) => new Date(d).toISOString());
  return env.renderString(body(file), ctx);
}

const page = (url, data = {}) => ({ url, date: "2026-10-01", data });
const site = { url: "https://leons.bloob.haus" };

describe("base sitemap.xml", () => {
  it("exists in the base theme", () => {
    expect(fs.existsSync(path.join(BASE_PAGES, "sitemap.njk"))).toBe(true);
  });

  it("lists a normal page with the site's own address", () => {
    const xml = render("sitemap.njk", { site, collections: { all: [page("/marbles/on-thresholds/")] } });
    expect(xml).toContain("<loc>https://leons.bloob.haus/marbles/on-thresholds/</loc>");
  });

  it("starts with the XML declaration (nothing may come before it)", () => {
    const xml = render("sitemap.njk", { site, collections: { all: [] } });
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  it("declares the sitemaps.org namespace (Google ignores a urlset without it)", () => {
    const xml = render("sitemap.njk", { site, collections: { all: [] } });
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it("never lists an unlisted page", () => {
    const xml = render("sitemap.njk", {
      site,
      collections: {
        all: [page("/marbles/public/"), page("/clients/a8f3k2/", { _bloob_unlisted: true })],
      },
    });
    expect(xml).toContain("/marbles/public/");
    expect(xml).not.toContain("/clients/a8f3k2/");
  });
});

describe("base robots.txt", () => {
  it("points search engines at this site's sitemap", () => {
    expect(fs.existsSync(path.join(BASE_PAGES, "robots.njk"))).toBe(true);
    const txt = render("robots.njk", { site });
    expect(txt).toContain("Sitemap: https://leons.bloob.haus/sitemap.xml");
  });
});

describe("one switch for every theme", () => {
  it("no maintained theme ships its own sitemap or robots page", () => {
    // alter-engineers is excepted: not maintained from this laptop (Leon, 2026-10-25).
    const themes = fs
      .readdirSync(THEMES, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "alter-engineers")
      .map((d) => d.name);
    const own = themes.flatMap((t) =>
      ["sitemap.njk", "robots.njk"]
        .filter((f) => fs.existsSync(path.join(THEMES, t, "pages", f)))
        .map((f) => `${t}/pages/${f}`),
    );
    expect(own).toEqual([]);
  });
});

describe("robots meta tag (partials/robots-meta.njk)", () => {
  const PARTIALS = path.join(THEMES, "_base/partials");
  const meta = (ctx) =>
    new nunjucks.Environment().renderString(body("robots-meta.njk", PARTIALS), ctx).trim();

  it("says nothing on a normal page of a quiet or yes site", () => {
    expect(meta({ site: { features: { show_in_search: "quiet" } } })).toBe("");
    expect(meta({ site: { features: { show_in_search: "yes" } } })).toBe("");
  });

  it("keeps an unlisted page out of search", () => {
    expect(meta({ site: { features: {} }, _bloob_unlisted: true })).toContain("noindex");
  });

  it("keeps every page of a show_in_search: no site out of search", () => {
    expect(meta({ site: { features: { show_in_search: "no" } } })).toContain("noindex");
  });

  it("is used by every maintained theme's head", () => {
    // A head that skips the partial silently ignores the switch for that theme.
    const heads = fs
      .readdirSync(THEMES, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "alter-engineers")
      .map((d) => path.join(THEMES, d.name, "partials/head.njk"))
      .filter((f) => fs.existsSync(f));
    expect(heads.length).toBeGreaterThan(1);
    for (const head of heads) {
      expect(fs.readFileSync(head, "utf-8"), head).toContain('{% include "partials/robots-meta.njk" %}');
    }
  });
});
