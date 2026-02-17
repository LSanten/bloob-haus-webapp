/**
 * Build Site Script
 * Orchestrates the full build: config → assemble → clone → preprocess → site build
 * Reads site configuration from sites/{name}.yaml
 *
 * Usage:
 *   node scripts/build-site.js --site=buffbaby
 *   SITE_NAME=buffbaby node scripts/build-site.js
 */

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { loadSiteConfig, resolveSiteName } from "./utils/config-loader.js";
import { assembleSrc } from "./assemble-src.js";
import { cloneContent } from "./clone-content.js";
import { preprocessContent } from "./preprocess-content.js";
import { generateOgImages } from "./generate-og-images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// Set BUILD_TARGET for preprocess-content.js
process.env.BUILD_TARGET = "eleventy";

/**
 * Main build function.
 */
async function buildSite() {
  const siteName = resolveSiteName();

  console.log("\n========================================");
  console.log(`  BLOOB HAUS BUILD (site: ${siteName})`);
  console.log("========================================\n");

  const startTime = Date.now();

  try {
    // Load environment variables (for GITHUB_TOKEN)
    loadEnv();

    // Step 1: Load site config
    console.log("--- Step 1: Loading site configuration ---\n");
    const config = await loadSiteConfig(siteName);
    console.log(`[config] Site: ${config.site.name}`);
    console.log(`[config] Theme: ${config.theme}`);
    console.log(`[config] Content repo: ${config.content.repo}`);

    // Make site name available to eleventy.config.js
    process.env.SITE_NAME = siteName;

    // Step 2: Assemble src/ from theme
    await assembleSrc(config);

    // Step 3: Clone content
    console.log("--- Step 3: Cloning content repository ---\n");
    const token = process.env.GITHUB_TOKEN;
    const repo = config.content.repo;

    if (!token) {
      throw new Error("Missing required environment variable: GITHUB_TOKEN");
    }

    const contentDir = await cloneContent({ token, repo });

    // Step 4: Preprocess content
    console.log("\n");

    // Pass config values to preprocessor via env vars
    // (preprocessor reads these — keeps its interface unchanged)
    process.env.CONTENT_REPO = config.content.repo;
    process.env.PUBLISH_MODE = config.content.publish_mode;
    process.env.BLOCKLIST_TAG = config.content.blocklist_tag;

    await preprocessContent({ contentDir });

    // Step 4.5: Generate OG preview images
    if (config.features.og_images) {
      await generateOgImages();
    }

    // Step 5: Bundle visualizers
    console.log("\n--- Step 5: Bundling visualizers ---");
    execSync("node scripts/bundle-visualizers.js", {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });

    // Step 6: Build Eleventy
    await buildEleventy(config);

    // Build summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const outputDir = path.join(ROOT_DIR, "_site");

    console.log("\n========================================");
    console.log("  BUILD COMPLETE");
    console.log("========================================");
    console.log(`  Site: ${config.site.name}`);
    console.log(`  Theme: ${config.theme}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Output: ${outputDir}`);
    console.log("========================================\n");
  } catch (error) {
    console.error("\n❌ BUILD FAILED:", error.message);
    process.exit(1);
  }
}

/**
 * Build with Eleventy
 */
async function buildEleventy(config) {
  console.log("\n--- Step 6: Running Eleventy build ---");
  const siteDir = path.join(ROOT_DIR, "_site");

  await fs.remove(siteDir);
  console.log("[eleventy] Cleaned _site directory");

  console.log("[eleventy] Building site...");
  execSync("npx @11ty/eleventy", {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (!(await fs.pathExists(siteDir))) {
    throw new Error("Eleventy build failed - _site directory not created");
  }

  const files = await fs.readdir(siteDir);
  console.log(`[eleventy] Build complete - ${files.length} entries in _site/`);

  // Step 7: Build Pagefind search index
  if (config.features.search) {
    console.log("\n--- Step 7: Building search index (Pagefind) ---");
    execSync("npx pagefind --site _site", {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    console.log("[pagefind] Search index built");
  }
}

/**
 * Loads environment variables from .env.local
 */
function loadEnv() {
  const envPath = path.join(ROOT_DIR, ".env.local");

  if (!fs.existsSync(envPath)) {
    console.warn("Warning: .env.local not found");
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildSite();
}

export { buildSite };
