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
import { glob } from "glob";
import {
  loadSiteConfig,
  resolveSiteName,
  ROOT_DIR,
} from "./utils/config-loader.js";
import { generateFavicons } from "./generate-favicons.js";
import { generateBloobIcons } from "./generate-bloob-icons.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getActiveSrcDir = () => process.env.SRC_DIR || path.join(ROOT_DIR, "src");
const THEMES_DIR = path.join(ROOT_DIR, "themes");

/**
 * Assembles the src/ directory from theme + base files.
 * @param {object} config - Site configuration from config-loader
 * @param {string} [contentDir] - Path to the cloned content directory (optional).
 *   If provided and the vault has an index.md at its root, the theme's index.njk
 *   is skipped so there is no permalink collision at "/".
 */
export async function assembleSrc(config, contentDir = null) {
  const SRC_DIR = getActiveSrcDir();
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

  // Step 2b: Copy base assets (shared JS, etc. — theme assets in Step 6 override these)
  if (fs.existsSync(path.join(baseDir, "assets"))) {
    console.log("[assemble] Copying base assets...");
    await fs.copy(path.join(baseDir, "assets"), path.join(SRC_DIR, "assets"));
  }

  // Step 2c: Copy base layouts (theme layouts in Step 3 override these)
  if (fs.existsSync(path.join(baseDir, "layouts"))) {
    console.log("[assemble] Copying base layouts...");
    await fs.copy(
      path.join(baseDir, "layouts"),
      path.join(SRC_DIR, "_includes", "layouts"),
    );
  }

  // Step 2d: Copy base pages (theme pages in Step 5 override these)
  if (fs.existsSync(path.join(baseDir, "pages"))) {
    console.log("[assemble] Copying base pages...");
    await fs.copy(path.join(baseDir, "pages"), SRC_DIR);
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
        // Also covers vault folders whose name slugifies to the section name — the preprocessor
        // (Step 9.5) will generate a stub index.md for them, so we must not copy index.njk here.
        // We check contentDir (the cloned vault), not srcDir — vault structure is source-of-truth here.
        const capitalized = section.charAt(0).toUpperCase() + section.slice(1);
        const toSlug = (s) => s.toLowerCase().replace(/\s+/g, "-");
        const contentDirFolders = contentDir
          ? (await fs.readdir(contentDir, { withFileTypes: true }))
              .filter((e) => e.isDirectory())
              .map((e) => toSlug(e.name))
          : [];
        const vaultHasSectionIndex =
          contentDirFolders.includes(section) ||
          (contentDir &&
            (fs.existsSync(path.join(contentDir, section, "index.md")) ||
              fs.existsSync(path.join(contentDir, section + ".md")) ||
              fs.existsSync(path.join(contentDir, capitalized + ".md"))));

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
      // Skip embed-pages.njk when features.embed is explicitly disabled
      if (entry === "embed-pages.njk" && config.features?.embed === false) {
        console.log("[assemble] Skipping embed-pages.njk (features.embed: false)");
        continue;
      }
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

  // Step 8: Copy eleventyComputed.js into the per-site src dir.
  // The source lives at lib/eleventyComputed.js (tracked in git).
  // With per-site src dirs it won't be there automatically, so we copy it on every assemble.
  const eleventyComputedSrc = path.join(ROOT_DIR, "lib", "eleventyComputed.js");
  const eleventyComputedDest = path.join(SRC_DIR, "_data", "eleventyComputed.js");
  if (fs.existsSync(eleventyComputedSrc)) {
    await fs.ensureDir(path.join(SRC_DIR, "_data"));
    await fs.copy(eleventyComputedSrc, eleventyComputedDest, { overwrite: true });
  }

  // Step 9: Generate favicons from site logo (must run after preprocessing copies attachments)
  console.log("[assemble] Generating favicons...");
  await generateFavicons({ config });

  // Step 10: Generate bloob-object icons (24×24, must run after theme assets are in src/)
  console.log("[assemble] Generating bloob-object icons...");
  await generateBloobIcons({ contentDir, srcDir: SRC_DIR });

  console.log("[assemble] Done! src/ is ready.\n");
}

/**
 * Clean only the theme-generated files in src/.
 * Preserves content directories (recipes/*.md, notes/*.md, media/, etc.)
 * and generated data files (tagIndex.json, visualizers.json).
 */
async function cleanGeneratedFiles() {
  const SRC_DIR = getActiveSrcDir();
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
 *   [[icon.png]]                  → looks up actual vault path in SRC_DIR (e.g. "/media/icon.png")
 *   [](media/marble%20simple.png) → "/media/marble%20simple.png"  (kept encoded — valid URL)
 *   [label](path/to/file.png)     → "/path/to/file.png"
 *   plain/path.png                → "plain/path.png" (passed through)
 *
 * NOTE: do NOT decode %20 etc. here — this value goes into HTML as a URL.
 *       generate-favicons.js does the decoding for disk lookups separately.
 * @param {string|undefined} value
 * @param {string} srcDir - SRC_DIR path; used to resolve wiki-link filenames via glob
 * @returns {Promise<string|null>}
 */
async function resolveLogoUrl(value, srcDir) {
  if (!value) return null;
  const s = String(value).trim();

  // [[wiki-link]] → search the already-preprocessed src/ tree for the file.
  // This is correct even when the vault's attachment folder is not media/ —
  // the file was already copied to src/ by preprocess-content.js before assemble runs.
  const wikiMatch = s.match(/^\[\[(.+?)\]\]$/);
  if (wikiMatch) {
    const filename = wikiMatch[1];
    const matches = await glob(`**/${filename}`, {
      cwd: srcDir,
      nodir: true,
      ignore: ["_includes/**", "_data/**", "assets/**", "og/**", "media/optimized/**"],
    });
    if (matches.length > 0) {
      // Convert to root-relative URL with forward slashes and percent-encode each segment
      const urlPath = "/" + matches[0].split(path.sep).map(encodeURIComponent).join("/");
      return urlPath;
    }
    // Fallback: assume media/ (backward-compat for vaults with standard attachment folder)
    console.warn(`[assemble] Logo/favicon file not found in src/: ${filename} — falling back to /media/${filename}`);
    return `/media/${encodeURIComponent(filename)}`;
  }

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
  const SRC_DIR = getActiveSrcDir();
  const dataDir = path.join(SRC_DIR, "_data");
  await fs.ensureDir(dataDir);

  const logoUrl = await resolveLogoUrl(config.site.logo || config.site.favicon, SRC_DIR);

  const siteJs = `// Generated by assemble-src.js — do not edit manually
export default {
  title: ${JSON.stringify(config.site.name)},
  description: ${JSON.stringify(config.site.description)},
  url: process.env.SITE_URL || ${JSON.stringify(config.site.url)},
  author: ${JSON.stringify(config.site.author)},
  languageCode: ${JSON.stringify(config.site.language)},
  footer_text: ${JSON.stringify(config.site.footer_text || "")},
  footer_searchbar: ${JSON.stringify(config.site.footer_searchbar || false)},
  logo: ${JSON.stringify(logoUrl)},
  year: new Date().getFullYear(),
  permalinks: {
    strategy: ${JSON.stringify(config.permalinks?.strategy || "preserve-case")},
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
