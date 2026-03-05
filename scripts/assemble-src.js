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
import { generateFavicons } from "./generate-favicons.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.join(ROOT_DIR, "src");
const THEMES_DIR = path.join(ROOT_DIR, "themes");

/**
 * Assembles the src/ directory from theme + base files.
 * @param {object} config - Site configuration from config-loader
 * @param {string} [contentDir] - Path to the cloned content directory (optional).
 *   If provided and the vault has an index.md at its root, the theme's index.njk
 *   is skipped so there is no permalink collision at "/".
 */
export async function assembleSrc(config, contentDir = null) {
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
    // Skip a section's index.njk if the vault has its own index.md for that folder
    // (same collision-prevention logic as root index.md).
    const sectionsDir = path.join(pagesDir, "sections");
    if (fs.existsSync(sectionsDir)) {
      const sections = await fs.readdir(sectionsDir);
      for (const section of sections) {
        const sectionSrc = path.join(sectionsDir, section);
        const sectionDest = path.join(SRC_DIR, section);
        const stat = await fs.stat(sectionSrc);
        if (!stat.isDirectory()) continue;

        // Skip theme section index if vault has its own page that would produce the same permalink.
        // Covers: section/index.md, section.md, or Section.md at vault root.
        const capitalized = section.charAt(0).toUpperCase() + section.slice(1);
        const vaultHasSectionIndex =
          contentDir &&
          (fs.existsSync(path.join(contentDir, section, "index.md")) ||
            fs.existsSync(path.join(contentDir, section + ".md")) ||
            fs.existsSync(path.join(contentDir, capitalized + ".md")));

        if (vaultHasSectionIndex) {
          // Copy everything in the section folder EXCEPT index.njk
          const sectionEntries = await fs.readdir(sectionSrc);
          for (const entry of sectionEntries) {
            if (entry === "index.njk") {
              console.log(
                `[assemble] Vault has ${section} page — skipping theme ${section}/index.njk`,
              );
              continue;
            }
            await fs.copy(
              path.join(sectionSrc, entry),
              path.join(sectionDest, entry),
              { overwrite: true },
            );
          }
        } else {
          await fs.copy(sectionSrc, sectionDest, { overwrite: true });
        }
      }
    }

    // If vault has index.md at its root, skip theme's index.njk to avoid permalink collision
    const vaultHasIndex = contentDir && fs.existsSync(path.join(contentDir, "index.md"));
    if (vaultHasIndex) {
      console.log("[assemble] Vault has index.md — skipping theme index.njk");
    }

    // Copy top-level pages (index.njk, 404.njk, etc. → src/)
    const entries = await fs.readdir(pagesDir);
    for (const entry of entries) {
      if (entry === "sections") continue; // already handled above
      if (entry === "index.njk" && vaultHasIndex) continue; // vault index takes precedence
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

  // Step 9: Generate favicons from site logo (must run after preprocessing copies attachments)
  console.log("[assemble] Generating favicons...");
  await generateFavicons({ config });

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
 * Resolves a logo/favicon field value to a URL path for use in templates.
 * Supports:
 *   [[icon.png]]                  → "/media/icon.png"
 *   [](media/marble%20simple.png) → "/media/marble%20simple.png"  (kept encoded — valid URL)
 *   [label](path/to/file.png)     → "/path/to/file.png"
 *   plain/path.png                → "plain/path.png" (passed through)
 *
 * NOTE: do NOT decode %20 etc. here — this value goes into HTML as a URL.
 *       generate-favicons.js does the decoding for disk lookups separately.
 * @param {string|undefined} value
 * @returns {string|null}
 */
function resolveLogoUrl(value) {
  if (!value) return null;
  const s = String(value).trim();

  // [[wiki-link]] → /media/filename (wiki filenames don't have URL encoding)
  const wikiMatch = s.match(/^\[\[(.+?)\]\]$/);
  if (wikiMatch) return `/media/${wikiMatch[1]}`;

  // [label](url) or [](url) — keep URL-encoded, just prefix with / if relative
  const mdMatch = s.match(/^\[.*?\]\((.+?)\)$/);
  if (mdMatch) {
    const p = mdMatch[1]; // keep %20 etc. intact — it's already a valid URL
    return p.startsWith("/") ? p : `/${p}`;
  }

  return s;
}

/**
 * Generate src/_data/site.js from site config.
 */
async function generateSiteData(config) {
  const dataDir = path.join(SRC_DIR, "_data");
  await fs.ensureDir(dataDir);

  const logoUrl = resolveLogoUrl(config.site.logo || config.site.favicon);

  const siteJs = `// Generated by assemble-src.js — do not edit manually
export default {
  title: ${JSON.stringify(config.site.name)},
  description: ${JSON.stringify(config.site.description)},
  url: process.env.SITE_URL || ${JSON.stringify(config.site.url)},
  author: ${JSON.stringify(config.site.author)},
  languageCode: ${JSON.stringify(config.site.language)},
  footer_text: ${JSON.stringify(config.site.footer_text || "")},
  logo: ${JSON.stringify(logoUrl)},
  year: new Date().getFullYear(),
  permalinks: {
    strategy: ${JSON.stringify(config.permalinks?.strategy || "slugify")},
  },
  features: ${JSON.stringify(config.features || {})},
  theme_settings: ${JSON.stringify(config.theme_settings || {})},
};
`;

  await fs.writeFile(path.join(dataDir, "site.js"), siteJs);
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const siteName = resolveSiteName();
  console.log(`[assemble] Loading config for site: ${siteName}`);

  // Optional --content-dir flag for local dev (points to the vault on disk)
  const contentDirArg = process.argv
    .find((a) => a.startsWith("--content-dir="))
    ?.replace("--content-dir=", "");
  const contentDir = contentDirArg
    ? path.resolve(contentDirArg)
    : null;

  // Pass contentDir so loadSiteConfig reads _bloob-settings.md from the right vault
  loadSiteConfig(siteName, { ...(contentDir && { contentDir }) })
    .then((config) => assembleSrc(config, contentDir))
    .catch((error) => {
      console.error("❌ Assembly failed:", error.message);
      process.exit(1);
    });
}
