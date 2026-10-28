/**
 * partials/seo-meta.njk — the SEO tags every theme head shares: title, description, canonical,
 * robots (through robots-meta.njk), Open Graph, Twitter. One place, so a fix lands in every theme.
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.join(__dirname, "../themes");
const PARTIALS = path.join(THEMES, "_base/partials");

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(THEMES, "_base")), { autoescape: true });

const site = { title: "Alter Engineers", description: "Engineering an alternative", url: "https://alterengineers.com", features: {} };

function render(ctx, sep) {
  const prefix = sep === undefined ? "" : `{% set seo_title_sep = "${sep}" %}`;
  return env.renderString(`${prefix}{% include "partials/seo-meta.njk" %}`, { site, page: { url: "/x/" }, ...ctx });
}
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)[1];
const metaContent = (html, attr) => html.match(new RegExp(`${attr}"\\s+content="([^"]*)"`))?.[1];

describe("seo-meta: title", () => {
  it("uses the homepage's own title when it has one", () => {
    const html = render({ page: { url: "/" }, title: "Alter Engineers – Sustainable MEP Engineering, Bay Area" });
    expect(titleOf(html)).toBe("Alter Engineers – Sustainable MEP Engineering, Bay Area");
  });

  it("falls back to the site title on a homepage without one", () => {
    expect(titleOf(render({ page: { url: "/" } }))).toBe("Alter Engineers");
  });

  it("joins page and site title with the theme's separator", () => {
    expect(titleOf(render({ title: "Campbell Library" }, " · "))).toBe("Campbell Library · Alter Engineers");
  });

  it("defaults to a pipe separator", () => {
    expect(titleOf(render({ title: "Campbell Library" }))).toBe("Campbell Library | Alter Engineers");
  });
});

describe("seo-meta: description", () => {
  it("prefers the automatic seo_description", () => {
    const html = render({ seo_description: "Auto text", description: "Hand text" });
    expect(metaContent(html, 'name="description')).toBe("Auto text");
    expect(metaContent(html, 'property="og:description')).toBe("Auto text");
    expect(metaContent(html, 'name="twitter:description')).toBe("Auto text");
  });

  it("falls back to description, then the site description", () => {
    expect(metaContent(render({ description: "Hand text" }), 'name="description')).toBe("Hand text");
    expect(metaContent(render({}), 'name="description')).toBe("Engineering an alternative");
  });

  it("escapes quotes and ampersands so the attribute survives", () => {
    const html = render({ seo_description: 'He said "hi" & left' });
    expect(html).toContain('content="He said &quot;hi&quot; &amp; left"');
  });
});

describe("seo-meta: robots", () => {
  it("keeps an unlisted page out of search", () => {
    expect(render({ _bloob_unlisted: true })).toContain('<meta name="robots" content="noindex,nofollow" />');
  });

  it("keeps every page of a show_in_search: no site out of search", () => {
    expect(render({ site: { ...site, features: { show_in_search: "no" } } })).toContain("noindex");
  });

  it("says nothing on a normal page", () => {
    expect(render({})).not.toContain('name="robots"');
  });
});

describe("seo-meta: Open Graph", () => {
  it("calls the homepage a website and other pages articles", () => {
    expect(metaContent(render({ page: { url: "/" } }), 'property="og:type')).toBe("website");
    expect(metaContent(render({ page: { url: "/projects/x/" } }), 'property="og:type')).toBe("article");
  });

  it("points canonical and og:url at the site's own address", () => {
    const html = render({ page: { url: "/projects/x/" } });
    expect(html).toContain('<link rel="canonical" href="https://alterengineers.com/projects/x/" />');
    expect(metaContent(html, 'property="og:url')).toBe("https://alterengineers.com/projects/x/");
  });

  it("adds image tags only when the page has an image", () => {
    expect(render({})).not.toContain("og:image");
    expect(render({ image: "/og/a.png" })).toContain('<meta property="og:image:type" content="image/png" />');
  });
});

describe("seo-meta: every theme head uses it", () => {
  it("every theme head includes seo-meta and has no <title> of its own", () => {
    const heads = fs
      .readdirSync(THEMES, { withFileTypes: true })
      // alter-engineers is excepted, as in sitemap-template.test.js (switched on the AE fork).
      .filter((d) => d.isDirectory() && d.name !== "alter-engineers")
      .map((d) => path.join(THEMES, d.name, "partials/head.njk"))
      .filter((f) => fs.existsSync(f));
    expect(heads.length).toBeGreaterThan(1);
    for (const head of heads) {
      const text = fs.readFileSync(head, "utf-8");
      expect(text, head).toContain('{% include "partials/seo-meta.njk" %}');
      expect(text, head).not.toContain("<title>");
    }
  });

  it("is where every theme gets the robots rule", () => {
    expect(fs.readFileSync(path.join(PARTIALS, "seo-meta.njk"), "utf-8")).toContain('{% include "partials/robots-meta.njk" %}');
  });
});
