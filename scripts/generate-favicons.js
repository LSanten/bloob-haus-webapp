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
 * Strips [[...]] wiki-link syntax from a field value.
 * @param {string} value - Raw value, e.g. "[[icon.png]]" or "/assets/logo.png"
 * @returns {string} Filename or path, e.g. "icon.png" or "/assets/logo.png"
 */
function stripWikiLink(value) {
  if (!value) return null;
  const match = String(value).match(/^\[\[(.+?)\]\]$/);
  return match ? match[1] : value;
}

/**
 * Resolves a logo field value to an absolute file path on disk.
 * Wiki-link filenames (e.g. "icon.png") are looked up in src/media/.
 * Plain paths (e.g. "/assets/logo.png") are resolved relative to src/.
 *
 * @param {string} rawValue - Raw logo value from site config
 * @returns {string|null} Absolute path to the source image, or null if unresolvable
 */
function resolveLogoPath(rawValue) {
  if (!rawValue) return null;
  const filename = stripWikiLink(rawValue);
  if (!filename) return null;

  // Wiki-link filename — find in src/media/
  if (!filename.startsWith("/")) {
    const candidate = path.join(SRC_DIR, "media", filename);
    return candidate;
  }

  // Plain path relative to src/
  return path.join(SRC_DIR, filename.replace(/^\//, ""));
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

  await sharp(sourceBuffer).resize(32, 32).png().toFile(path.join(SRC_DIR, "favicon.png"));
  await sharp(sourceBuffer).resize(180, 180).png().toFile(path.join(SRC_DIR, "apple-touch-icon.png"));

  await fs.writeFile(hashFile, hash);

  console.log("[favicon] Generated favicon.png (32×32) and apple-touch-icon.png (180×180)");
}
