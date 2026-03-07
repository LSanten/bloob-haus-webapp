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
import { generateFavicons } from "./generate-favicons.js";
import { generateBloobIcons } from "./generate-bloob-icons.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// Set BUILD_TARGET for preprocess-content.js
process.env.BUILD_TARGET = "eleventy";

/**
 * Check if --strict flag is set (fail build on broken links).
 */
function isStrictMode() {
  return process.argv.includes("--strict");
}

/**
 * Main build function.
 */
async function buildSite() {
  const siteName = resolveSiteName();
  const strict = isStrictMode();

  console.log("\n========================================");
  console.log(`  BLOOB HAUS BUILD (site: ${siteName})`);
  console.log("========================================\n");

  const startTime = Date.now();

  try {
    // Load environment variables (for GITHUB_TOKEN)
    loadEnv();

    // Step 1: Load initial site config (yaml only — for repo/branch info)
    console.log("--- Step 1: Loading initial site configuration ---\n");
    let config = await loadSiteConfig(siteName, { skipBloobSettings: true });
    console.log(`[config] Content repo: ${config.content.repo}`);

    // Make site name available to eleventy.config.js
    process.env.SITE_NAME = siteName;

    // Step 2: Clone content
    console.log("\n--- Step 2: Cloning content repository ---\n");
    const token = process.env.GITHUB_TOKEN;
    const repo = config.content.repo;

    if (!token) {
      throw new Error("Missing required environment variable: GITHUB_TOKEN");
    }

    const branch = config.content.branch;
    let contentDir = await cloneContent({ token, repo, branch });

    // If config specifies a subfolder within the repo, use that as content root
    if (config.content.path) {
      contentDir = path.join(contentDir, config.content.path);
      console.log(`[config] Using content subfolder: ${config.content.path}`);
      if (!(await fs.pathExists(contentDir))) {
        throw new Error(`Content subfolder not found: ${config.content.path}`);
      }
    }

    // Step 3: Reload config with _bloob-settings.md merged
    console.log("\n--- Step 3: Loading full configuration (with _bloob-settings.md) ---\n");
    config = await loadSiteConfig(siteName, { contentDir });
    console.log(`[config] Site: ${config.site?.name || siteName}`);
    console.log(`[config] Theme: ${config.theme}`);

    // Step 4: Assemble src/ from theme
    // Pass contentDir so assemble-src can detect vault index.md
    await assembleSrc(config, contentDir);

    // Step 5: Preprocess content
    console.log("\n");

    // Pass config values to preprocessor via env vars
    // (preprocessor reads these — keeps its interface unchanged)
    process.env.CONTENT_REPO = config.content.repo;
    process.env.PUBLISH_MODE = config.content.publish_mode;
    process.env.BLOCKLIST_TAG = config.content.blocklist_tag;
    process.env.EXCLUDE_FILES = (config.content.exclude_files || []).join(",");
    process.env.SLUG_STRATEGY = config.permalinks?.strategy || "slugify";

    const preprocessResult = await preprocessContent({ contentDir });

    // Strict mode: fail if broken links found
    if (strict && preprocessResult.brokenLinkDetails?.length > 0) {
      throw new Error(
        `--strict: ${preprocessResult.brokenLinkDetails.length} broken link(s) found. See validation report above.`,
      );
    }

    // Step 5.5: Generate OG preview images
    if (config.features?.og_images) {
      await generateOgImages();
    }

    // Step 5.6: Generate favicons from site logo (runs after preprocessing copies attachments)
    console.log("\n--- Step 5.6: Generating favicons ---");
    await generateFavicons({ config });

    // Step 5.7: Generate bloob-object icons (needs src/media/ populated by preprocessing)
    // assemble-src Step 10 ran too early for content-repo images; this catches them.
    console.log("\n--- Step 5.7: Generating bloob-object icons ---");
    await generateBloobIcons({ contentDir, srcDir: path.join(ROOT_DIR, "src") });

    // Step 6: Bundle visualizers
    console.log("\n--- Step 6: Bundling visualizers ---");
    execSync("node scripts/bundle-visualizers.js", {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });

    // Step 7: Build Eleventy
    await buildEleventy(config);

    // Build summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const mountPath = config.mount_path;
    const outputDir = mountPath
      ? path.join(ROOT_DIR, "_site", mountPath)
      : path.join(ROOT_DIR, "_site");

    console.log("\n========================================");
    console.log("  BUILD COMPLETE");
    console.log("========================================");
    console.log(`  Site: ${config.site?.name || siteName}`);
    console.log(`  Theme: ${config.theme}`);
    if (mountPath) console.log(`  Mount path: /${mountPath}/`);
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
  console.log("\n--- Step 7: Running Eleventy build ---");
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

  // Step 8: Build Pagefind search index
  if (config.features?.search) {
    console.log("\n--- Step 8: Building search index (Pagefind) ---");
    const pagefindSite = config.mount_path ? `_site/${config.mount_path}` : "_site";
    execSync(`npx pagefind --site ${pagefindSite}`, {
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
