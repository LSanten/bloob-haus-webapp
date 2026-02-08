/**
 * Build Site Script
 * Orchestrates the full build: clone → preprocess → site build
 * Supports both Hugo and Eleventy targets via --target flag
 */

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { cloneContent } from "./clone-content.js";
import { preprocessContent } from "./preprocess-content.js";
import { generateOgImages } from "./generate-og-images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// Parse --target flag from command line args
const args = process.argv.slice(2);
const targetArg = args.find((a) => a.startsWith("--target="));
const target = targetArg ? targetArg.split("=")[1] : "hugo";

// Set BUILD_TARGET for preprocess-content.js
process.env.BUILD_TARGET = target;

/**
 * Main build function.
 */
async function buildSite() {
  console.log("\n========================================");
  console.log(`  BLOOB HAUS BUILD (target: ${target})`);
  console.log("========================================\n");

  const startTime = Date.now();

  try {
    // Load environment variables
    loadEnv();

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.CONTENT_REPO;

    if (!token || !repo) {
      throw new Error(
        "Missing required environment variables: GITHUB_TOKEN and CONTENT_REPO",
      );
    }

    // Step 1: Clone content
    console.log("--- Step 1: Cloning content repository ---\n");
    const contentDir = await cloneContent({ token, repo });

    // Step 2: Preprocess content (target-aware via BUILD_TARGET env var)
    console.log("\n");
    await preprocessContent({ contentDir });

    // Step 2.5: Generate OG preview images
    await generateOgImages();

    // Step 3: Build site
    if (target === "eleventy") {
      await buildEleventy();
    } else {
      await buildHugo();
    }

    // Build summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const outputDir =
      target === "eleventy"
        ? path.join(ROOT_DIR, "_site")
        : path.join(ROOT_DIR, "public");

    console.log("\n========================================");
    console.log("  BUILD COMPLETE");
    console.log("========================================");
    console.log(`  Target: ${target}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`  Output: ${outputDir}`);
    console.log("========================================\n");
  } catch (error) {
    console.error("\n❌ BUILD FAILED:", error.message);
    process.exit(1);
  }
}

/**
 * Build with Hugo
 */
async function buildHugo() {
  console.log("\n--- Step 3: Running Hugo build ---");
  const hugoDir = path.join(ROOT_DIR, "hugo");
  const publicDir = path.join(ROOT_DIR, "public");

  await fs.remove(publicDir);
  console.log("[hugo] Cleaned public directory");

  console.log("[hugo] Building site...");
  execSync("npx hugo", {
    cwd: hugoDir,
    stdio: "inherit",
  });

  if (!(await fs.pathExists(publicDir))) {
    throw new Error("Hugo build failed - public directory not created");
  }

  const files = await fs.readdir(publicDir);
  console.log(`[hugo] Build complete - ${files.length} files in public/`);
}

/**
 * Build with Eleventy
 */
async function buildEleventy() {
  console.log("\n--- Step 3: Running Eleventy build ---");
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
