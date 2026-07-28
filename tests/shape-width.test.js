/**
 * Shape width contract — a shape declares `width: prose|wide|full`; the
 * container and theme decide whether to grant it.
 *
 * Spec: docs/superpowers/specs/2026-07-28-shape-width-contract-design.md
 *
 * Tested in BOTH directions, following tests/shape-nesting.test.js, so the
 * feature cannot regress into "everything got wide":
 *   - a wide collection really is wider than the prose column
 *   - prose siblings are NOT dragged wider with it
 *
 * The load-bearing assertion is the degradation one: a theme that defines no
 * --shape-width-wide must render byte-identically to before this feature
 * existed. That is what makes `"width": "wide"` safe as a shared default for
 * melt / marbles-pouch / warm-kitchen / buffbaby, none of which opted in.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveWidth, WIDTHS } from "../lib/visualizers/collection/renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf-8");

const PROSE_WIDTH = 820;

// ── the pure resolver ────────────────────────────────────────────────────────

describe("resolveWidth", () => {
  it("falls back to prose when nothing is declared", () => {
    expect(resolveWidth({}, undefined)).toBe("prose");
  });

  it("uses the shape's manifest default", () => {
    expect(resolveWidth({}, "wide")).toBe("wide");
  });

  it("lets an instance override the shape default in both directions", () => {
    expect(resolveWidth({ width: "prose" }, "wide")).toBe("prose");
    expect(resolveWidth({ width: "full" }, "prose")).toBe("full");
  });

  it("falls back to prose on an unknown value rather than throwing", () => {
    expect(resolveWidth({ width: "enormous" }, "wide")).toBe("prose");
    expect(resolveWidth({ width: 42 }, "wide")).toBe("prose");
    expect(resolveWidth({ width: null }, "wide")).toBe("wide"); // null → default
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveWidth({ width: "  WIDE " }, "prose")).toBe("wide");
  });

  it("accepts exactly the documented vocabulary", () => {
    expect(WIDTHS).toEqual(["prose", "wide", "full"]);
  });
});

// ── the emitted attribute ────────────────────────────────────────────────────

describe("collection emits its width preference", () => {
  it('defaults to wide, and omits the attribute entirely for prose', async () => {
    const manifest = JSON.parse(read("lib/visualizers/collection/manifest.json"));
    expect(manifest.width).toBe("wide");

    const { transform } = await import("../lib/visualizers/collection/index.js");
    const fence = (body) =>
      `<pre><code class="language-collection">${body}</code></pre>`;

    const wide = transform(fence("source: all\n"));
    expect(wide).toContain('data-width="wide"');

    // prose is the absence of the attribute — no styling hook, no dead markup
    const prose = transform(fence("source: all\nwidth: prose\n"));
    expect(prose).not.toContain("data-width");
  });
});

// ── rendered behaviour, in a real browser ────────────────────────────────────

let browser = null;

beforeAll(async () => {
  try {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch();
  } catch {
    browser = null; // no chromium — browser tests below self-skip
  }
}, 60_000);

afterAll(async () => {
  if (browser) await browser.close();
});

/**
 * A minimal article page: a prose paragraph and a wide collection, side by side
 * inside the same .article-body, so both directions can be measured at once.
 */
function buildPage({ optIn }) {
  const css = [
    `:root { --article-width: ${PROSE_WIDTH}px; --spacing-md: 1.5rem;${
      optIn ? " --shape-width-wide: 1200px;" : ""
    } }`,
    read("lib/visualizers/article/styles.css"),
  ];
  return `${css.map((c) => `<style>${c}</style>`).join("\n")}
    <body style="margin:0">
      <article class="article-page">
        <div class="article-body">
          <p id="prose">prose</p>
          <div id="wide" data-width="wide">wide</div>
          <div id="plain">plain</div>
        </div>
      </article>
    </body>`;
}

async function widths(optIn, viewport = 1440) {
  const page = await browser.newPage({ viewport: { width: viewport, height: 900 } });
  try {
    await page.setContent(buildPage({ optIn }), { waitUntil: "load" });
    return await page.evaluate(() => ({
      prose: Math.round(document.querySelector("#prose").getBoundingClientRect().width),
      wide: Math.round(document.querySelector("#wide").getBoundingClientRect().width),
      plain: Math.round(document.querySelector("#plain").getBoundingClientRect().width),
      overflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
  } finally {
    await page.close();
  }
}

describe("width contract in a real browser", () => {
  it("a theme that has NOT opted in renders wide exactly like prose", async () => {
    if (!browser) return;
    const r = await widths(false);
    expect(r.wide).toBe(r.prose);
    expect(r.overflows).toBe(false);
  });

  it("an opted-in theme makes the wide child wider than the prose column", async () => {
    if (!browser) return;
    const r = await widths(true);
    expect(r.wide).toBeGreaterThan(r.prose);
    expect(r.wide).toBeGreaterThan(PROSE_WIDTH);
  });

  it("does NOT drag prose siblings wider with it", async () => {
    if (!browser) return;
    const r = await widths(true);
    expect(r.prose).toBeLessThanOrEqual(PROSE_WIDTH);
    expect(r.plain).toBe(r.prose);
  });

  it("never causes horizontal overflow, even when wide exceeds the viewport", async () => {
    if (!browser) return;
    for (const vw of [1440, 1000, 800]) {
      const r = await widths(true, vw);
      expect(r.overflows, `overflowed at ${vw}px`).toBe(false);
    }
  });

  it("collapses to prose measure on a phone", async () => {
    if (!browser) return;
    const r = await widths(true, 390);
    expect(r.wide).toBe(r.prose);
    expect(r.overflows).toBe(false);
  });
});
