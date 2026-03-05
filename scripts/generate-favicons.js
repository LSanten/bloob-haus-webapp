/**
 * Favicon Generator
 *
 * Generates favicon.png (32×32) and apple-touch-icon.png (180×180) from
 * the site logo declared in _bloob-settings.md.
 *
 * Logo value format: plain path or [[wiki-link]] syntax pointing to an attachment.
 * Attachments are copied to src/media/ during preprocessing, so this must run after.
 *
 * Caching: stores an MD5 hash of the source image alongside the output files.
 * If the source hasn't changed, generation is skipped.
 */

import sharp from "sharp";
import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");

/**
 * Extracts a file path from supported YAML link formats:
 *   [[icon.png]]                   → "icon.png"
 *   [](media/marble%20simple.png)  → "media/marble simple.png"  (URL-decoded)
 *   [label](path/to/file.png)      → "path/to/file.png"
 *   plain/path.png                 → "plain/path.png"
 *
 * @param {string} value - Raw value from site config
 * @returns {string|null}
 */
function extractFilePath(value) {
  if (!value) return null;
  const s = String(value).trim();

  // [[wiki-link]]
  const wikiMatch = s.match(/^\[\[(.+?)\]\]$/);
  if (wikiMatch) return wikiMatch[1];

  // [label](url) or [](url) — standard markdown link
  const mdMatch = s.match(/^\[.*?\]\((.+?)\)$/);
  if (mdMatch) return decodeURIComponent(mdMatch[1]);

  return s;
}

/**
 * Resolves a logo field value to an absolute file path on disk.
 *
 * Handles:
 *   - [[icon.png]]                  → src/media/icon.png
 *   - [](media/marble simple.png)   → src/media/marble simple.png  (path relative to src/)
 *   - /assets/logo.png              → src/assets/logo.png
 *
 * @param {string} rawValue - Raw logo value from site config
 * @returns {string|null} Absolute path to the source image, or null if unresolvable
 */
function resolveLogoPath(rawValue) {
  if (!rawValue) return null;

  // Detect wiki-links before extracting — bare [[filename]] means Obsidian attachment
  // Attachments are copied to src/media/ during preprocessing
  const isWikiLink = /^\[\[.+\]\]$/.test(String(rawValue).trim());

  const filePath = extractFilePath(rawValue);
  if (!filePath) return null;

  // Absolute URL path → resolve relative to src/
  if (filePath.startsWith("/")) {
    return path.join(SRC_DIR, filePath.replace(/^\//, ""));
  }

  // Wiki-links are bare attachment filenames → look in src/media/
  if (isWikiLink && !filePath.includes("/")) {
    return path.join(SRC_DIR, "media", filePath);
  }

  // Relative path (e.g. "media/icon.png") → resolve relative to src/
  return path.join(SRC_DIR, filePath);
}

/**
 * Generates favicons from the site logo.
 * Skips generation if the source image hash hasn't changed.
 *
 * @param {Object} options
 * @param {Object} options.config - Full site config (expects config.site.logo or config.site.favicon)
 */
export async function generateFavicons({ config }) {
  const rawLogo = config.site?.logo || config.site?.favicon;
  if (!rawLogo) {
    console.log("[favicon] No logo/favicon set in site config — skipping");
    return;
  }

  const sourceImagePath = resolveLogoPath(rawLogo);
  if (!sourceImagePath || !(await fs.pathExists(sourceImagePath))) {
    console.warn(
      `[favicon] Source image not found at: ${sourceImagePath} — skipping favicon generation`,
    );
    return;
  }

  // Read source and compute hash for caching
  const sourceBuffer = await fs.readFile(sourceImagePath);
  const hash = crypto.createHash("md5").update(sourceBuffer).digest("hex").slice(0, 8);

  const hashFile = path.join(SRC_DIR, ".favicon-hash");
  const existingHash = await fs.readFile(hashFile, "utf-8").catch(() => "");

  if (existingHash.trim() === hash) {
    console.log("[favicon] Source unchanged — using cached favicons");
    return;
  }

  console.log(`[favicon] Generating favicons from: ${sourceImagePath}`);

  await sharp(sourceBuffer).resize(64, 64).sharpen({ sigma: 0.5 }).png().toFile(path.join(SRC_DIR, "favicon.png"));
  await sharp(sourceBuffer).resize(310, 310).sharpen({ sigma: 0.5 }).png().toFile(path.join(SRC_DIR, "apple-touch-icon.png"));

  await fs.writeFile(hashFile, hash);

  console.log("[favicon] Generated favicon.png (64×64) and apple-touch-icon.png (310×310)");
}
