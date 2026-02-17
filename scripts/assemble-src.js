/**
 * Assemble Src Script
 * Assembles the src/ directory from theme files + base partials + site config.
 * src/ is entirely generated at build time — never edit files in src/ directly.
 *
 * Usage:
 *   node scripts/assemble-src.js --site=buffbaby
 *   SITE_NAME=buffbaby node scripts/assemble-src.js
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadSiteConfig,
  resolveSiteName,
  ROOT_DIR,
} from "./utils/config-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.join(ROOT_DIR, "src");
const THEMES_DIR = path.join(ROOT_DIR, "themes");

/**
 * Assembles the src/ directory from theme + base files.
 * @param {object} config - Site configuration from config-loader
 */
export async function assembleSrc(config) {
  const themeName = config.theme;
  const themeDir = path.join(THEMES_DIR, themeName);
  const baseDir = path.join(THEMES_DIR, "_base");

  console.log("\n--- Assembling src/ from theme ---");
  console.log(`[assemble] Theme: ${themeName}`);
  console.log(`[assemble] Theme dir: ${themeDir}`);

  if (!fs.existsSync(themeDir)) {
    throw new Error(`Theme not found: ${themeDir}`);
  }

  // Step 1: Clean generated directories in src/
  // Only clean theme-managed paths — NOT content directories (recipes/, notes/, media/, etc.)
  await cleanGeneratedFiles();

  // Step 2: Copy base partials (shared across all themes)
  if (fs.existsSync(path.join(baseDir, "partials"))) {
    console.log("[assemble] Copying base partials...");
    await fs.copy(
      path.join(baseDir, "partials"),
      path.join(SRC_DIR, "_includes", "partials"),
    );
  }

  // Step 3: Copy theme layouts
  if (fs.existsSync(path.join(themeDir, "layouts"))) {
    console.log("[assemble] Copying theme layouts...");
    await fs.copy(
      path.join(themeDir, "layouts"),
      path.join(SRC_DIR, "_includes", "layouts"),
    );
  }

  // Step 4: Copy theme partials (override base partials with same name)
  if (fs.existsSync(path.join(themeDir, "partials"))) {
    console.log("[assemble] Copying theme partials (overrides base)...");
    await fs.copy(
      path.join(themeDir, "partials"),
      path.join(SRC_DIR, "_includes", "partials"),
    );
  }

  // Step 5: Copy theme pages (homepage, tags, 404, feed, etc.)
  if (fs.existsSync(path.join(themeDir, "pages"))) {
    console.log("[assemble] Copying theme pages...");
    const pagesDir = path.join(themeDir, "pages");

    // Copy section index pages (pages/sections/recipes/index.njk → src/recipes/index.njk)
    const sectionsDir = path.join(pagesDir, "sections");
    if (fs.existsSync(sectionsDir)) {
      const sections = await fs.readdir(sectionsDir);
      for (const section of sections) {
        const sectionSrc = path.join(sectionsDir, section);
        const sectionDest = path.join(SRC_DIR, section);
        const stat = await fs.stat(sectionSrc);
        if (stat.isDirectory()) {
          await fs.copy(sectionSrc, sectionDest, { overwrite: true });
        }
      }
    }

    // Copy top-level pages (index.njk, 404.njk, etc. → src/)
    const entries = await fs.readdir(pagesDir);
    for (const entry of entries) {
      if (entry === "sections") continue; // already handled above
      const srcPath = path.join(pagesDir, entry);
      const destPath = path.join(SRC_DIR, entry);
      await fs.copy(srcPath, destPath, { overwrite: true });
    }
  }

  // Step 6: Copy theme assets (CSS, JS)
  if (fs.existsSync(path.join(themeDir, "assets"))) {
    console.log("[assemble] Copying theme assets...");
    await fs.copy(path.join(themeDir, "assets"), path.join(SRC_DIR, "assets"));
  }

  // Step 7: Generate src/_data/site.js from config
  console.log("[assemble] Generating site data...");
  await generateSiteData(config);

  // Step 8: Copy eleventyComputed.js (shared infrastructure, not theme-specific)
  // This file is checked into the repo root at src/_data/eleventyComputed.js
  // but since we clean _data/site.js, we need to ensure eleventyComputed.js persists.
  // It's NOT cleaned (we only clean site.js), so it stays in place.

  console.log("[assemble] Done! src/ is ready.\n");
}

/**
 * Clean only the theme-generated files in src/.
 * Preserves content directories (recipes/*.md, notes/*.md, media/, etc.)
 * and generated data files (tagIndex.json, visualizers.json).
 */
async function cleanGeneratedFiles() {
  console.log("[assemble] Cleaning generated theme files...");

  // Clean layouts and partials
  await fs.remove(path.join(SRC_DIR, "_includes", "layouts"));
  await fs.remove(path.join(SRC_DIR, "_includes", "partials"));

  // Clean generated site data (but not tagIndex.json, visualizers.json, or eleventyComputed.js)
  const dataDir = path.join(SRC_DIR, "_data");
  if (fs.existsSync(dataDir)) {
    const dataEntries = await fs.readdir(dataDir);
    for (const entry of dataEntries) {
      if (entry.startsWith("site") && entry.endsWith(".js")) {
        await fs.remove(path.join(dataDir, entry));
      }
    }
  }

  // Clean theme CSS (but not visualizer CSS which is generated by bundle-visualizers)
  const mainCssPath = path.join(SRC_DIR, "assets", "css", "main.css");
  if (fs.existsSync(mainCssPath)) {
    await fs.remove(mainCssPath);
  }

  // Clean top-level .njk pages
  const srcEntries = await fs.readdir(SRC_DIR).catch(() => []);
  for (const entry of srcEntries) {
    if (entry.endsWith(".njk")) {
      await fs.remove(path.join(SRC_DIR, entry));
    }
  }

  // Clean section .njk files (but not generated .md content)
  const sectionDirs = ["recipes", "notes", "resources", "lists-of-favorites"];
  for (const section of sectionDirs) {
    const sectionPath = path.join(SRC_DIR, section);
    if (!fs.existsSync(sectionPath)) continue;
    const entries = await fs.readdir(sectionPath);
    for (const entry of entries) {
      if (entry.endsWith(".njk")) {
        await fs.remove(path.join(sectionPath, entry));
      }
    }
  }
}

/**
 * Generate src/_data/site.js from site config.
 */
async function generateSiteData(config) {
  const dataDir = path.join(SRC_DIR, "_data");
  await fs.ensureDir(dataDir);

  const siteJs = `// Generated by assemble-src.js — do not edit manually
export default {
  title: ${JSON.stringify(config.site.name)},
  description: ${JSON.stringify(config.site.description)},
  url: process.env.SITE_URL || ${JSON.stringify(config.site.url)},
  author: ${JSON.stringify(config.site.author)},
  languageCode: ${JSON.stringify(config.site.language)},
  year: new Date().getFullYear(),
  permalinks: {
    slugify: true,
  },
};
`;

  await fs.writeFile(path.join(dataDir, "site.js"), siteJs);
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const siteName = resolveSiteName();
  console.log(`[assemble] Loading config for site: ${siteName}`);

  loadSiteConfig(siteName)
    .then((config) => assembleSrc(config))
    .catch((error) => {
      console.error("❌ Assembly failed:", error.message);
      process.exit(1);
    });
}
