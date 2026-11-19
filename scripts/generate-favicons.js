/**
 * Favicon Generator
 *
 * Generates favicon.png (64×64), favicon.ico (32×32 + 48×48) and apple-touch-icon.png (310×310) from
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
import { glob } from "glob";
import { safeDecode } from "./utils/safe-decode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const getSrcDir = () => process.env.SRC_DIR || path.join(ROOT_DIR, "src");

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
  if (mdMatch) return safeDecode(mdMatch[1]);

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
async function resolveLogoPath(rawValue, srcDir) {
  if (!rawValue) return null;

  // Detect wiki-links before extracting — bare [[filename]] means Obsidian attachment
  // Attachments are copied to src/media/ during preprocessing
  const isWikiLink = /^\[\[.+\]\]$/.test(String(rawValue).trim());

  const filePath = extractFilePath(rawValue);
  if (!filePath) return null;

  // Absolute URL path → resolve relative to src/
  if (filePath.startsWith("/")) {
    return path.join(srcDir, filePath.replace(/^\//, ""));
  }

  // Wiki-links are bare attachment filenames.
  // Search the whole src/ tree (vault structure is preserved after preprocessing)
  // so logos placed outside media/ are found correctly.
  if (isWikiLink && !filePath.includes("/")) {
    const matches = await glob(`**/${filePath}`, {
      cwd: srcDir,
      nodir: true,
      ignore: ["media/optimized/**", "og/**"],
    });
    if (matches.length > 0) return path.join(srcDir, matches[0]);
    // Fallback: check src/media/ for backward compat
    return path.join(srcDir, "media", filePath);
  }

  // Relative path (e.g. "media/icon.png") → resolve relative to src/
  return path.join(srcDir, filePath);
}

/**
 * Packs PNG images into one .ico file. ICO allows PNG-encoded images inside (all current browsers
 * read them), so no extra dependency is needed: a 6-byte header, one 16-byte directory entry per
 * image, then the PNG bytes.
 *
 * @param {Array<{size: number, png: Buffer}>} images - square PNGs, size in px (≤ 256)
 * @returns {Buffer}
 */
export function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(images.length, 4);

  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir[o] = size >= 256 ? 0 : size; // width (0 means 256)
    dir[o + 1] = size >= 256 ? 0 : size; // height
    dir[o + 2] = 0; // palette colours
    dir[o + 3] = 0; // reserved
    dir.writeUInt16LE(1, o + 4); // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });

  return Buffer.concat([header, dir, ...images.map((img) => img.png)]);
}

/**
 * Generates favicons from the site logo.
 * Skips generation if the source image hash hasn't changed.
 *
 * @param {Object} options
 * @param {Object} options.config - Full site config (expects config.site.logo or config.site.favicon)
 */
export async function generateFavicons({ config }) {
  const SRC_DIR = getSrcDir();
  const rawLogo = config.site?.favicon || config.site?.logo;
  if (!rawLogo) {
    console.log("[favicon] No logo/favicon set in site config — skipping");
    return;
  }

  const sourceImagePath = await resolveLogoPath(rawLogo, SRC_DIR);
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

  const faviconExists = await fs.pathExists(path.join(SRC_DIR, "favicon.png"));
  const touchIconExists = await fs.pathExists(path.join(SRC_DIR, "apple-touch-icon.png"));
  const icoExists = await fs.pathExists(path.join(SRC_DIR, "favicon.ico"));
  const allExist = faviconExists && touchIconExists && icoExists;
  if (existingHash.trim() === hash && allExist) {
    console.log("[favicon] Source unchanged — using cached favicons");
    return;
  }
  if (existingHash.trim() === hash && !allExist) {
    console.log("[favicon] Source unchanged but output missing — regenerating...");
  }

  console.log(`[favicon] Generating favicons from: ${sourceImagePath}`);

  await sharp(sourceBuffer).resize(64, 64).sharpen({ sigma: 0.5 }).png().toFile(path.join(SRC_DIR, "favicon.png"));
  await sharp(sourceBuffer).resize(310, 310).sharpen({ sigma: 0.5 }).png().toFile(path.join(SRC_DIR, "apple-touch-icon.png"));

  // favicon.ico: what browsers, feed readers and link-preview tools fetch by default when a page
  // names no icon (or when they never read the page at all).
  const icoImages = await Promise.all(
    [32, 48].map(async (size) => ({
      size,
      png: await sharp(sourceBuffer).resize(size, size).sharpen({ sigma: 0.5 }).png().toBuffer(),
    })),
  );
  await fs.writeFile(path.join(SRC_DIR, "favicon.ico"), buildIco(icoImages));

  await fs.writeFile(hashFile, hash);

  console.log("[favicon] Generated favicon.png (64×64), favicon.ico (32+48) and apple-touch-icon.png (310×310)");
}
