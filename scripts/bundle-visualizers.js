/**
 * Bundle Visualizers
 *
 * Auto-discovers visualizer packages in lib/visualizers/ and:
 * 1. Bundles browser.js → src/assets/js/visualizers/<name>.js (via esbuild)
 * 2. Copies styles.css → src/assets/css/visualizers/<name>.css
 * 3. Copies engine.js → src/assets/js/visualizers/<name>.engine.js (plain copy, no bundle)
 *    engine.js is a self-contained IIFE shared by the visualizer and its paired magic machine.
 * 4. Bundles builder/index.js → src/assets/js/visualizers/<name>-builder.js (via esbuild),
 *    if present. This is a debug-only overlay bundle (e.g. scene-nav's admin builder) that
 *    browser.js lazy-loads via dynamic import() — it is intentionally NOT added to the
 *    manifest/visualizers.json, so normal visitors never fetch it.
 *
 * Adding a new visualizer = adding a new folder in lib/visualizers/.
 * No changes to this script needed.
 */

import {
  readdirSync,
  existsSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { join, dirname } from "path";
import { build } from "esbuild";

const VISUALIZERS_DIR = "lib/visualizers";
const SRC = process.env.SRC_DIR || "src";
const JS_OUT_DIR = `${SRC}/assets/js/visualizers`;
const CSS_OUT_DIR = `${SRC}/assets/css/visualizers`;
const DATA_OUT = `${SRC}/_data/visualizers.json`;

// Ensure output directories exist
mkdirSync(JS_OUT_DIR, { recursive: true });
mkdirSync(CSS_OUT_DIR, { recursive: true });
mkdirSync(dirname(DATA_OUT), { recursive: true });

// Auto-discover visualizer folders
const visualizerDirs = readdirSync(VISUALIZERS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

console.log(
  `\n[bundle] Found ${visualizerDirs.length} visualizer(s): ${visualizerDirs.join(", ")}`,
);

// Collect manifest for template auto-includes
const manifest = [];

for (const name of visualizerDirs) {
  const dir = join(VISUALIZERS_DIR, name);
  const browserEntry = join(dir, "browser.js");
  const stylesFile   = join(dir, "styles.css");
  const engineFile   = join(dir, "engine.js");
  const entry = { name, hasJs: false, hasCss: false, hasEngine: false };

  // Bundle browser.js with esbuild
  if (existsSync(browserEntry)) {
    await build({
      entryPoints: [browserEntry],
      bundle: true,
      outfile: join(JS_OUT_DIR, `${name}.js`),
      format: "iife",
      minify: process.env.NODE_ENV === "production",
      sourcemap: process.env.NODE_ENV !== "production",
    });
    entry.hasJs = true;
    console.log(`[bundle] ${name}: browser.js → ${JS_OUT_DIR}/${name}.js`);
  }

  // Bundle builder/index.js with esbuild (debug-only overlay, dynamically imported
  // by browser.js — not part of the manifest, so it's excluded from visualizers.json)
  const builderEntry = join(dir, "builder", "index.js");
  if (existsSync(builderEntry)) {
    await build({
      entryPoints: [builderEntry],
      bundle: true,
      outfile: join(JS_OUT_DIR, `${name}-builder.js`),
      format: "iife",
      minify: process.env.NODE_ENV === "production",
      sourcemap: process.env.NODE_ENV !== "production",
    });
    console.log(`[bundle] ${name}: builder/index.js → ${JS_OUT_DIR}/${name}-builder.js`);
  }

  // Copy styles.css
  if (existsSync(stylesFile)) {
    copyFileSync(stylesFile, join(CSS_OUT_DIR, `${name}.css`));
    entry.hasCss = true;
    console.log(`[bundle] ${name}: styles.css → ${CSS_OUT_DIR}/${name}.css`);
  }

  // Copy engine.js (plain IIFE — no bundling needed, shared with magic machine)
  if (existsSync(engineFile)) {
    copyFileSync(engineFile, join(JS_OUT_DIR, `${name}.engine.js`));
    entry.hasEngine = true;
    console.log(`[bundle] ${name}: engine.js → ${JS_OUT_DIR}/${name}.engine.js`);
  }

  // Copy shape-shipped static assets (icons, sprites) into the build output —
  // per shapes.md "What a complete shape carries": copied like JS/CSS, never
  // served from a central CDN. URL: /assets/visualizers/<name>/…
  const assetsDir = join(dir, "assets");
  if (existsSync(assetsDir)) {
    const assetsOut = join(SRC, "assets", "visualizers", name);
    cpSync(assetsDir, assetsOut, { recursive: true, dereference: true });
    entry.hasAssets = true;
    console.log(`[bundle] ${name}: assets/ → ${assetsOut}`);
  }

  manifest.push(entry);
}

// Write manifest so Nunjucks templates can auto-include visualizer assets
writeFileSync(DATA_OUT, JSON.stringify(manifest, null, 2));
console.log(`[bundle] Wrote ${DATA_OUT} (${manifest.length} visualizer(s))`);

console.log("[bundle] Done.\n");
