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

import { readdirSync, existsSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";
import { build } from "esbuild";

const VISUALIZERS_DIR = "lib/visualizers";
const JS_OUT_DIR = "src/assets/js/visualizers";
const CSS_OUT_DIR = "src/assets/css/visualizers";

// Ensure output directories exist
mkdirSync(JS_OUT_DIR, { recursive: true });
mkdirSync(CSS_OUT_DIR, { recursive: true });

// Auto-discover visualizer folders
const visualizerDirs = readdirSync(VISUALIZERS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

console.log(`\n[bundle] Found ${visualizerDirs.length} visualizer(s): ${visualizerDirs.join(", ")}`);

for (const name of visualizerDirs) {
  const dir = join(VISUALIZERS_DIR, name);
  const browserEntry = join(dir, "browser.js");
  const stylesFile = join(dir, "styles.css");

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
    console.log(`[bundle] ${name}: browser.js → ${JS_OUT_DIR}/${name}.js`);
  }

  // Copy styles.css
  if (existsSync(stylesFile)) {
    copyFileSync(stylesFile, join(CSS_OUT_DIR, `${name}.css`));
    console.log(`[bundle] ${name}: styles.css → ${CSS_OUT_DIR}/${name}.css`);
  }
}

console.log("[bundle] Done.\n");
