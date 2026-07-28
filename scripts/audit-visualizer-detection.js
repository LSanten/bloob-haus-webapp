/**
 * Audit per-page visualizer detection against a REAL running site.
 *
 *   node scripts/audit-visualizer-detection.js [--url=http://localhost:8080] [--src=src-melt]
 *
 * Run this whenever a `detect` block is added or changed, and before enabling
 * `features.per_page_visualizers` on a new site.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 * Verifying "does this shape emit the class I put in its manifest?" is NOT
 * enough. A visualizer's stylesheet can own classes that something ELSE renders.
 * The real case: article/styles.css owns `.share-bar` / `.share-btn`, which
 * themes/_base/partials/share-bar.njk renders on ordinary pages. Detecting only
 * `.article-page` silently dropped share-bar styling from 33 melt pages, and a
 * screenshot diff only surfaced it as an unexplained 5px height change.
 *
 * ── Method ────────────────────────────────────────────────────────────────────
 * Load each page from a build where ALL visualizer CSS is present, disable
 * exactly the stylesheets detection would have dropped, and compare the
 * geometry of every element. Any movement means detection is wrong.
 *
 * This audits CSS. Dropped JS is safe by a different argument: a shape's
 * browser.js only acts on its own markup, so with the markup absent it is a
 * no-op. The exception is a shape that attaches to ANOTHER shape's output
 * (page-preview → Pagefind results), and those are marked `detect.always`.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { detectVisualizers } from "./utils/visualizer-detection.js";
import { isMainModule } from "./utils/is-main.js";

function parseArgs(argv) {
  const get = (k, d) => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`));
    return hit ? hit.split("=").slice(1).join("=") : d;
  };
  return { baseUrl: get("url", "http://localhost:8080"), srcDir: get("src", null) };
}

/** Every built page's URL path, from the _site directory. */
function findPages(dir, base = "") {
  const skip = new Set(["pagefind", "media", "assets", "og"]);
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...findPages(p, `${base}/${e.name}`));
    else if (e.name === "index.html") out.push({ url: `${base}/`, file: p });
    else if (e.name.endsWith(".html")) out.push({ url: `${base}/${e.name}`, file: p });
  }
  return out;
}

export async function auditDetection({ baseUrl, srcDir, siteDir = "_site" } = {}) {
  const { chromium } = await import("@playwright/test");

  const src = srcDir || process.env.SRC_DIR || "src";
  const visualizers = JSON.parse(readFileSync(join(src, "_data", "visualizers.json"), "utf-8"));
  const pages = findPages(siteDir);

  // Pages whose detection outcome is identical exercise the same code path, so
  // auditing one per distinct signature covers every real case. On a 1165-page
  // site this is the difference between ~20 minutes and ~20 seconds.
  const bySignature = new Map();
  let totalSkipped = 0;
  for (const p of pages) {
    const html = readFileSync(p.file, "utf-8");
    const { skipped } = detectVisualizers(visualizers, html, { enabled: true });
    const droppedCss = skipped.filter((n) => visualizers.find((v) => v.name === n)?.hasCss);
    totalSkipped += droppedCss.length;
    if (!droppedCss.length) continue;

    const sig = droppedCss.slice().sort().join(",");
    if (!bySignature.has(sig)) bySignature.set(sig, { ...p, droppedCss, count: 0 });
    bySignature.get(sig).count += 1;
  }

  const sample = [...bySignature.values()];
  console.log(
    `[audit] ${pages.length} pages · ${visualizers.length} visualizers · ${baseUrl}\n` +
      `[audit] ${sample.length} distinct detection signature(s) — auditing one page each\n`
  );

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const failures = [];

  for (const { url, droppedCss, count } of sample) {

    const page = await ctx.newPage();
    try {
      await page.goto(baseUrl + url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(400);

      const moved = await page.evaluate(async (names) => {
        // Drop every element that renders at zero size before measuring.
        //
        // This page comes from a build where the dropped shapes' JS also ran, so
        // it contains runtime-injected, display:none scaffolding those shapes
        // create for themselves (fridge-magnets injects a hidden .fm-modal).
        // In a real per-page build that JS is dropped alongside the CSS, so the
        // markup never exists. Un-styling it here would "reveal" a modal that
        // could never appear in production — a false positive.
        //
        // Removing zero-size nodes cannot affect any other element's layout, so
        // this is safe, and it keeps the audit sensitive to what matters: a
        // VISIBLE element changing geometry (the .share-bar case).
        for (const el of [...document.querySelectorAll("body *")]) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) el.remove();
        }

        const describe = (e) => {
          const r = e.getBoundingClientRect();
          return `${Math.round(r.width)}x${Math.round(r.height)}`;
        };
        const els = () => [...document.querySelectorAll("body *")];
        const snap = () => els().map(describe);

        const links = names
          .map((n) => [...document.querySelectorAll("link[rel=stylesheet]")]
            .find((l) => l.href.includes(`/visualizers/${n}.css`)))
          .filter(Boolean);

        const settle = () =>
          new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        // CONTROL PASS: measure twice with nothing changed. Anything that moves
        // on its own is animated (marble float/scale runs on requestAnimationFrame)
        // and must be excluded, or every animated element reads as a CSS
        // regression.
        const control1 = snap();
        await settle();
        const control2 = snap();
        const animated = new Set();
        for (let i = 0; i < control1.length; i++) {
          if (control1[i] !== control2[i]) animated.add(i);
        }

        const before = snap();
        links.forEach((l) => (l.disabled = true));
        await settle();
        const after = snap();
        links.forEach((l) => (l.disabled = false));

        const nodes = els();
        const diffs = [];
        for (let i = 0; i < Math.min(before.length, after.length); i++) {
          if (animated.has(i)) continue;
          if (before[i] !== after[i]) {
            const el = nodes[i];
            const cls = String(el.className).trim().split(/\s+/)[0] || "";
            diffs.push(`${el.tagName.toLowerCase()}${cls ? "." + cls : ""} ${before[i]} -> ${after[i]}`);
          }
        }
        return diffs.slice(0, 6);
      }, droppedCss);

      if (moved.length) {
        failures.push({ url, droppedCss, moved, count });
        console.log(`FAIL ${url}  (signature shared by ${count} page(s))`);
        moved.forEach((m) => console.log(`       ${m}`));
      }
    } catch (e) {
      failures.push({ url, error: String(e).split("\n")[0] });
      console.log(`ERR  ${url} — ${String(e).split("\n")[0]}`);
    }
    await page.close();
  }

  await browser.close();

  const affected = failures.reduce((n, f) => n + (f.count || 1), 0);
  console.log(
    `\n[audit] ${sample.length - failures.length}/${sample.length} signatures safe ` +
      `(covering ${pages.length - affected}/${pages.length} pages) · ` +
      `${totalSkipped} stylesheet drops`
  );
  if (failures.length) {
    console.log(
      `[audit] ${failures.length} page(s) would lose styling. Add the missing class to the\n` +
        `        owning shape's manifest.json "detect.selectors", or mark it detect.always.`
    );
  } else {
    console.log("[audit] detection is safe for every page.");
  }
  return failures;
}

if (isMainModule(import.meta.url)) {
  const { baseUrl, srcDir } = parseArgs(process.argv.slice(2));
  auditDetection({ baseUrl, srcDir })
    .then((f) => process.exit(f.length ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(1); });
}
