/**
 * Bundle Visualizers
 *
 * Auto-discovers visualizer packages in lib/visualizers/ and:
 * 1. Bundles browser.js → src/assets/js/visualizers/<name>.js (via esbuild)
 * 2. Copies styles.css → src/assets/css/visualizers/<name>.css
 *
 * Adding a new visualizer = adding a new folder in lib/visualizers/.
 * No changes to this script needed.
 */

import {
  readdirSync,
  existsSync,
  copyFileSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { build } from "esbuild";

const VISUALIZERS_DIR = "lib/visualizers";
const JS_OUT_DIR = "src/assets/js/visualizers";
const CSS_OUT_DIR = "src/assets/css/visualizers";
const DATA_OUT = "src/_data/visualizers.json";

// Ensure output directories exist
mkdirSync(JS_OUT_DIR, { recursive: true });
mkdirSync(CSS_OUT_DIR, { recursive: true });

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
  const stylesFile = join(dir, "styles.css");
  const entry = { name, hasJs: false, hasCss: false };

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

  // Copy styles.css
  if (existsSync(stylesFile)) {
    copyFileSync(stylesFile, join(CSS_OUT_DIR, `${name}.css`));
    entry.hasCss = true;
    console.log(`[bundle] ${name}: styles.css → ${CSS_OUT_DIR}/${name}.css`);
  }

  manifest.push(entry);
}

// Write manifest so Nunjucks templates can auto-include visualizer assets
writeFileSync(DATA_OUT, JSON.stringify(manifest, null, 2));
console.log(`[bundle] Wrote ${DATA_OUT} (${manifest.length} visualizer(s))`);

console.log("[bundle] Done.\n");
