/**
 * No third-party code on an unlisted page.
 *
 * An unlisted page's only protection is its unguessable URL. Analytics, comment widgets and the
 * GoatCounter visitor count are "Tier C" in docs/architecture/security-by-obscurity.md: they read
 * window.location and send the full secret URL to a third party. So the four _base partials that
 * inject site-configured third-party code render nothing when `_bloob_unlisted` is set — on every
 * site, with no opt-out.
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PARTIALS = path.join(ROOT, "themes/_base/partials");

const env = new nunjucks.Environment(null, { autoescape: true });
env.addFilter("injectPageVars", (s) => s);

const site = {
  url: "https://example.bloob.haus",
  snippets: {
    head: '<script data-test="head" src="https://tracker.example/a.js"></script>',
    bodyEnd: '<script data-test="footer">track()</script>',
  },
  embeds: { "fast-comments-embed": '<div data-test="comments"></div>' },
  analytics: { goatcounter_code: "example", show_visitor_count: true },
};

const CASES = [
  ["site-snippets-head.njk", 'data-test="head"'],
  ["site-snippets-footer.njk", 'data-test="footer"'],
  ["comments.njk", 'data-test="comments"'],
  ["visitor-count.njk", "visitor-count"],
];

const render = (file, extra = {}) =>
  env.renderString(fs.readFileSync(path.join(PARTIALS, file), "utf-8"), { site, page: { url: "/x/" }, ...extra });

describe("third-party partials on unlisted pages", () => {
  for (const [file, marker] of CASES) {
    it(`${file} renders on a listed page`, () => {
      expect(render(file)).toContain(marker);
    });

    it(`${file} renders nothing on an unlisted page`, () => {
      expect(render(file, { _bloob_unlisted: true })).not.toContain(marker);
    });
  }
});

describe("no theme bypasses the guard", () => {
  it("only the four guarded partials read site snippets or the comments embed", () => {
    const allowed = new Set(CASES.map(([f]) => path.join(PARTIALS, f)));
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(njk|js)$/.test(entry.name) && !entry.name.endsWith(".test.js") && !allowed.has(full)) {
          const text = fs.readFileSync(full, "utf-8");
          if (/site\.snippets|fast-comments-embed/.test(text)) offenders.push(path.relative(ROOT, full));
        }
      }
    };
    walk(path.join(ROOT, "themes"));
    walk(path.join(ROOT, "lib/visualizers"));
    expect(offenders).toEqual([]);
  });
});
