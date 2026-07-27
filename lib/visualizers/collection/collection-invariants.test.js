/**
 * Collection — build-time output invariants.
 *
 * These tests exist to protect the alter-engineers site during the
 * pure-renderer refactor (see docs/superpowers/specs/2026-07-27-collection-
 * pure-renderer-design.md). The AE vault does NOT exist on Leon's MacBook, so
 * AE's production `display: cards` output cannot be verified by building it.
 *
 * Instead the current output is frozen into a committed golden file
 * (__golden__/cards-build-output.html) and compared byte-for-byte. If the
 * refactor changes so much as a space in the cards markup, these fail.
 *
 * Regenerate deliberately (only when a cards change is *intended*):
 *   UPDATE_GOLDEN=1 npx vitest run collection-invariants
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, "__golden__");
const GOLDEN_FILE = path.join(GOLDEN_DIR, "cards-build-output.html");

/**
 * graph.json fixture. Deliberately exercises the paths AE depends on:
 * images, subtitles, extra fields, redirects, archived exclusion, folder-index
 * stubs, and HTML-escaping.
 */
const FIXTURE_GRAPH = {
  nodes: [
    { id: "/projects/", section: "projects", type: "page", website_status: "public", title: "Projects" },
    {
      id: "/projects/riverside-school/",
      section: "projects",
      type: "page",
      website_status: "public",
      title: "Riverside School",
      subtitle: "A timber-framed primary school",
      image: "/og/riverside-og.jpeg",
      building_type: "School",
      location: "Bristol",
      sqft: 12000,
      tags: ["sustainability", "timber"],
    },
    {
      id: "/projects/harbour-works/",
      section: "projects",
      type: "page",
      website_status: "public",
      title: "Harbour Works",
      subtitle: "Mixed-use waterfront",
      building_type: "Mixed Use",
      location: "Cardiff",
    },
    {
      id: "/projects/archived-thing/",
      section: "projects",
      type: "page",
      website_status: "archived",
      title: "Archived Thing",
    },
    {
      id: "/projects/external-ref/",
      section: "projects",
      type: "page",
      website_status: "public",
      title: "External <Ref> & Co",
      redirect: "https://example.com/thing",
    },
    { id: "/articles/intro/", section: "articles", type: "page", website_status: "public", title: "Intro" },
  ],
};

/**
 * Each case is rendered through the real Eleventy transform and concatenated
 * into the golden file. Names double as section headers so a diff is readable.
 */
const CASES = [
  ["cards / default search", "source: folder=projects\ndisplay: cards\n"],
  ["cards / show_fields", "source: folder=projects\ndisplay: cards\nshow_fields: building_type, location, sqft\n"],
  ["cards / search off", "source: folder=projects\ndisplay: cards\nsearch: off\n"],
  ["cards / search basics", "source: folder=projects\ndisplay: cards\nsearch: basics\n"],
  ["cards / sort reverse-alpha", "source: folder=projects\ndisplay: cards\nsort: reverse-alpha\n"],
  ["cards / limit 1", "source: folder=projects\ndisplay: cards\nlimit: 1\n"],
  ["cards / tag source", "source: tag=sustainability\ndisplay: cards\n"],
  ["cards / field source", "source: field:building_type=School\ndisplay: cards\n"],
  ["cards / all source", "source: all\ndisplay: cards\n"],
  ["cards / empty result", "source: folder=nonexistent\ndisplay: cards\n"],
  ["cards / implicit (no display key)", "source: folder=projects\n"],
];

let transform;

beforeAll(async () => {
  // graph.json must exist on disk at SRC_DIR before index.js first reads it.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "collection-golden-"));
  fs.writeFileSync(path.join(tmp, "graph.json"), JSON.stringify(FIXTURE_GRAPH));
  process.env.SRC_DIR = tmp;

  ({ transform } = await import("./index.js"));
});

function renderAll() {
  return CASES.map(([label, yaml]) => {
    const fence = `<pre><code class="language-collection">${yaml}</code></pre>`;
    return `<!-- ===== ${label} ===== -->\n${transform(fence)}`;
  }).join("\n\n");
}

describe("collection build-time output — AE protection", () => {
  it("graph.json fixture is actually being read (guards against a silent empty-graph pass)", () => {
    const out = transform(
      `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`
    );
    // If graph.json were unavailable, index.js falls back to an empty placeholder
    // div and every golden comparison below would trivially "pass" while proving
    // nothing. Assert real card content is present.
    expect(out).toContain("Riverside School");
    expect(out).toContain('href="/projects/riverside-school/"');
    expect(out).toContain("fp-cards");
  });

  it("cards markup is byte-identical to the committed golden", () => {
    const actual = renderAll();

    if (process.env.UPDATE_GOLDEN === "1" || !fs.existsSync(GOLDEN_FILE)) {
      fs.mkdirSync(GOLDEN_DIR, { recursive: true });
      fs.writeFileSync(GOLDEN_FILE, actual);
      // Writing the golden is not a passing verification of anything.
      expect(
        process.env.UPDATE_GOLDEN,
        "golden file was (re)generated — re-run without UPDATE_GOLDEN to verify"
      ).toBe("1");
      return;
    }

    expect(actual).toBe(fs.readFileSync(GOLDEN_FILE, "utf-8"));
  });
});

describe("collection build-time output — invariants that must hold for AE", () => {
  it("excludes archived pages and the folder-index stub", () => {
    const out = transform(
      `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`
    );
    expect(out).not.toContain("Archived Thing");
    expect(out).not.toContain('href="/projects/"');
  });

  it("keeps data-pagefind-ignore on the container (listing must not pad site search)", () => {
    const out = transform(
      `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`
    );
    expect(out).toContain("data-pagefind-ignore");
  });

  it("emits no-pswp on card images (prevents invalid nested anchors)", () => {
    const out = transform(
      `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`
    );
    expect(out).toContain('class="no-pswp"');
  });

  it("escapes HTML in titles", () => {
    const out = transform(
      `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`
    );
    expect(out).toContain("&lt;Ref&gt;");
    expect(out).not.toContain("<Ref>");
  });

  it("renders redirects as external links", () => {
    const out = transform(
      `<pre><code class="language-collection">source: folder=projects\ndisplay: cards\n</code></pre>`
    );
    expect(out).toContain('href="https://example.com/thing"');
    expect(out).toContain('target="_blank"');
  });
});
