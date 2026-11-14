/**
 * The license on a page, three ways (the `license:` setting, scripts/utils/license.js):
 *   - for people: one quiet line at the foot (partials/license-line.njk, in each theme's footer)
 *   - for machines: <link rel="license"> in the head (partials/seo-meta.njk)
 *   - for machines: `license` in the page's one JSON-LD block (partials/structured-data.njk)
 * A note's own `license:` wins over the site's; `license: none` takes it away.
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pageLicense, parseLicense } from "../scripts/utils/license.js";
import { licensedPageNode, mergeStructuredData, jsonLdScript } from "../scripts/utils/structured-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.join(__dirname, "../themes");

// The same filters eleventy.config.js registers.
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(THEMES, "_base")), { autoescape: true });
env.addFilter("pageLicense", (raw, siteLicense) => pageLicense(raw, siteLicense));
env.addFilter("structuredDataScript", (siteData, license, url, title) =>
  jsonLdScript(mergeStructuredData(siteData, licensedPageNode(license, url, title))),
);
env.addFilter("injectPageVars", (s) => s);

const PERSON = { "@context": "https://schema.org", "@type": "Person", name: "Leon Santen" };
const site = (extra = {}) => ({
  title: "Leon's Bloob Haus",
  url: "https://leons.bloob.haus",
  features: {},
  snippets: {},
  license: parseLicense("CC BY-NC-SA 4.0"),
  ...extra,
});
const render = (partial, ctx = {}) =>
  env.renderString(`{% include "partials/${partial}" %}`, {
    site: site(),
    page: { url: "/marbles/RADICALNESS/" },
    title: "Radicalness",
    ...ctx,
  });
const jsonLdOf = (html) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  return m.map((s) => JSON.parse(s.replace(/^<script[^>]*>|<\/script>$/g, "")));
};

describe("license-line.njk: for people", () => {
  it("says the site's license and links to it", () => {
    expect(render("license-line.njk").trim()).toBe(
      '<p class="license-line">Shared under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="license">CC BY-NC-SA 4.0</a></p>',
    );
  });

  it("says a note's own license instead", () => {
    const html = render("license-line.njk", { license: "CC0" });
    expect(html).toContain('href="https://creativecommons.org/publicdomain/zero/1.0/"');
    expect(html).toContain(">CC0 1.0</a>");
  });

  it("shows an unrecognised license as written, with no link", () => {
    const html = render("license-line.njk", { license: "All rights reserved" });
    expect(html).toContain('<p class="license-line">License: All rights reserved</p>');
    expect(html).not.toContain("<a");
  });

  it("is absent with `license: none`, or when the site has none", () => {
    expect(render("license-line.njk", { license: "none" }).trim()).toBe("");
    expect(render("license-line.njk", { site: site({ license: null }) }).trim()).toBe("");
  });

  it("uses no em dash", () => {
    expect(fs.readFileSync(path.join(THEMES, "_base/partials/license-line.njk"), "utf-8")).not.toMatch(/—/);
  });
});

describe("seo-meta.njk: <link rel=license> for machines", () => {
  it("links the page's license", () => {
    expect(render("seo-meta.njk")).toContain('<link rel="license" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" />');
  });

  it("follows a note's override", () => {
    expect(render("seo-meta.njk", { license: "CC BY 4.0" })).toContain(
      '<link rel="license" href="https://creativecommons.org/licenses/by/4.0/" />',
    );
  });

  it("has no link without a license URL", () => {
    expect(render("seo-meta.njk", { license: "All rights reserved" })).not.toContain('rel="license"');
    expect(render("seo-meta.njk", { license: "none" })).not.toContain('rel="license"');
  });
});

describe("structured-data.njk: one JSON-LD block per page", () => {
  it("carries the license as part of the page", () => {
    const [ld] = jsonLdOf(render("structured-data.njk"));
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: "https://leons.bloob.haus/marbles/RADICALNESS/",
      name: "Radicalness",
      license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    });
  });

  it("joins the site's structured-data fence instead of adding a second block", () => {
    const blocks = jsonLdOf(render("site-snippets-head.njk", { site: site({ structured_data: PERSON }) }));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]["@graph"].map((n) => n["@type"])).toEqual(["Person", "WebPage"]);
  });

  it("is the fence alone, as before, on a page without a license", () => {
    const blocks = jsonLdOf(render("site-snippets-head.njk", { site: site({ structured_data: PERSON, license: null }) }));
    expect(blocks).toEqual([PERSON]);
  });

  it("is absent with neither", () => {
    expect(render("structured-data.njk", { site: site({ license: null }) }).trim()).toBe("");
  });

  it("is absent on an unlisted page", () => {
    expect(render("structured-data.njk", { _bloob_unlisted: true, site: site({ structured_data: PERSON }) }).trim()).toBe("");
  });
});

describe("every theme shows the line", () => {
  // alter-engineers is the client's own footer and head; it has no license and isn't wired.
  for (const theme of ["bloob-haus-26", "marbles-pouch", "melt", "warm-kitchen"]) {
    it(`${theme}'s footer includes license-line.njk`, () => {
      const footer = fs.readFileSync(path.join(THEMES, theme, "partials/footer.njk"), "utf-8");
      expect(footer).toContain('{% include "partials/license-line.njk" %}');
    });
  }

  it("no theme claims a license on its own any more", () => {
    for (const theme of fs.readdirSync(THEMES)) {
      const footer = path.join(THEMES, theme, "partials/footer.njk");
      if (fs.existsSync(footer)) expect(fs.readFileSync(footer, "utf-8"), theme).not.toMatch(/CC BY|creativecommons/);
    }
  });
});
