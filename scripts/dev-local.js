/**
 * Local Dev Script
 * Builds from a local vault directory (no GitHub clone).
 * Runs: preprocess → assemble theme → bundle visualizers → Eleventy serve + theme watcher.
 *
 * Usage:
 *   node scripts/dev-local.js --site=marbles --content=../bloob-haus-marbles
 *   node scripts/dev-local.js --site=buffbaby --content=../buffbaby
 */

import { execSync } from "child_process";
import { rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { loadSiteConfig, resolveSiteName } from "./utils/config-loader.js";
import { assembleSrc } from "./assemble-src.js";
import { preprocessContent } from "./preprocess-content.js";
import { generateOgImages } from "./generate-og-images.js";
import { bakeMarbles } from "./bake-marbles.js";
import { getSrcDir } from "./utils/get-src-dir.js";
import { optimizeGifs } from "./optimize-gifs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

process.env.BUILD_TARGET = "eleventy";

function getContentDir() {
  const arg = process.argv.find((a) => a.startsWith("--content="));
  if (arg) return path.resolve(ROOT_DIR, arg.split("=")[1]);

  console.error(
    "Error: --content=<path> is required. Example: node scripts/dev-local.js --site=marbles --content=../bloob-haus-marbles"
  );
  process.exit(1);
}

function getPageFilter() {
  const arg = process.argv.find((a) => a.startsWith("--page="));
  return arg ? arg.slice(7) : null;
}

async function devLocal() {
  const siteName = resolveSiteName();
  const contentDir = getContentDir();
  const pageFilter = getPageFilter();

  console.log("\n========================================");
  console.log(`  LOCAL DEV (site: ${siteName})`);
  console.log(`  Content: ${contentDir}`);
  if (pageFilter) console.log(`  Page filter: ${pageFilter}`);
  console.log("========================================\n");

  // Load site config with _bloob-settings.md merged from content directory
  const config = await loadSiteConfig(siteName, { contentDir });
  console.log(`[config] Site: ${config.site?.name || siteName}`);
  console.log(`[config] Theme: ${config.theme}`);
  process.env.SITE_NAME = siteName;
  process.env.CONTENT_DIR = contentDir;

  // Pass config to preprocessor
  process.env.CONTENT_REPO = config.content.repo;
  process.env.PUBLISH_MODE = config.content.publish_mode;
  process.env.BLOCKLIST_TAG = config.content.blocklist_tag;
  process.env.EXCLUDE_FILES = (config.content.exclude_files || []).join(",");
  process.env.SLUG_STRATEGY = config.permalinks?.strategy || "preserve-case";

  // Derive per-site src/ directory and expose to all child scripts via env
  const srcDir = getSrcDir(config.site?.url);
  process.env.SRC_DIR = srcDir;

  // Step 0: Clean output directory so no stale files from a previous site's build carry over.
  // src-*/ directories persist (preprocessed cache + image optimizations stay warm).
  const outputDir = path.join(ROOT_DIR, config.mount_path ? `_site/${config.mount_path}` : "_site");
  if (existsSync(outputDir)) {
    console.log(`\n--- Cleaning ${path.relative(ROOT_DIR, outputDir)}/ ---`);
    rmSync(outputDir, { recursive: true, force: true });
  }

  // Step 1: Preprocess content (must run before assemble — copies attachments needed for favicons)
  await preprocessContent({ contentDir, ...(pageFilter && { pageFilter }) });

  // Step 1.2: Convert GIFs to MP4
  await optimizeGifs({ srcDir, config });

  // Step 1.5: Generate OG preview images (skipped in single-page mode — cache is hash-based and unaffected)
  if (config.features?.og_images && !pageFilter) {
    await generateOgImages();
  }
  // Step 1.6: Bake every marble into a picture (after the link previews it reads)
  if (!pageFilter) await bakeMarbles({ srcDir });

  // Step 2: Assemble theme (favicon generation reads from src/media/ populated in step 1)
  await assembleSrc(config, contentDir);

  // Step 3: Bundle visualizers
  console.log("\n--- Bundling visualizers ---");
  execSync("node scripts/bundle-visualizers.js", {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  // --build: build once into _site and stop (before/after comparisons, screenshots)
  if (process.argv.includes("--build")) {
    console.log("\n--- Building once with Eleventy ---\n");
    execSync("npx @11ty/eleventy", { cwd: ROOT_DIR, stdio: "inherit", env: { ...process.env, SITE_NAME: siteName } });
    return;
  }

  // Step 4: Serve with Eleventy + watch themes concurrently
  console.log("\n--- Starting Eleventy dev server ---\n");
  // SITE_NAME is already set in process.env above — child processes inherit it.
  // Use cross-env-style env passing via execSync env option instead of inline syntax (Windows compat).
  execSync(
    `npx concurrently -n watch,eleventy -c blue,green "node scripts/watch-themes.js --site=${siteName}" "npx @11ty/eleventy --serve"`,
    { cwd: ROOT_DIR, stdio: "inherit", env: { ...process.env, SITE_NAME: siteName } },
  );
}

devLocal().catch((error) => {
  console.error("\n❌ Dev failed:", error.message);
  process.exit(1);
});
