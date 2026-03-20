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
import path from "path";
import { fileURLToPath } from "url";

import { loadSiteConfig, resolveSiteName } from "./utils/config-loader.js";
import { assembleSrc } from "./assemble-src.js";
import { preprocessContent } from "./preprocess-content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

process.env.BUILD_TARGET = "eleventy";

function getContentDir() {
  const arg = process.argv.find((a) => a.startsWith("--content="));
  if (arg) return path.resolve(ROOT_DIR, arg.split("=")[1]);

  // Default: look for content-source/ (from a previous full build)
  return path.join(ROOT_DIR, "content-source");
}

async function devLocal() {
  const siteName = resolveSiteName();
  const contentDir = getContentDir();

  console.log("\n========================================");
  console.log(`  LOCAL DEV (site: ${siteName})`);
  console.log(`  Content: ${contentDir}`);
  console.log("========================================\n");

  // Load site config with _bloob-settings.md merged from content directory
  const config = await loadSiteConfig(siteName, { contentDir });
  console.log(`[config] Site: ${config.site?.name || siteName}`);
  console.log(`[config] Theme: ${config.theme}`);
  process.env.SITE_NAME = siteName;

  // Pass config to preprocessor
  process.env.CONTENT_REPO = config.content.repo;
  process.env.PUBLISH_MODE = config.content.publish_mode;
  process.env.BLOCKLIST_TAG = config.content.blocklist_tag;
  process.env.EXCLUDE_FILES = (config.content.exclude_files || []).join(",");
  process.env.SLUG_STRATEGY = config.permalinks?.strategy || "slugify";

  // Step 1: Preprocess content (must run before assemble — copies attachments needed for favicons)
  await preprocessContent({ contentDir });

  // Step 2: Assemble theme (favicon generation reads from src/media/ populated in step 1)
  await assembleSrc(config, contentDir);

  // Step 3: Bundle visualizers
  console.log("\n--- Bundling visualizers ---");
  execSync("node scripts/bundle-visualizers.js", {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

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
