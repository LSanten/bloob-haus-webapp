/**
 * Generate OG Preview Images
 * Creates social-sharing-optimized images for pages with image frontmatter.
 * Runs after preprocessing, before Eleventy build.
 *
 * - PNG sources → PNG previews (preserves transparency)
 * - JPEG sources → JPEG previews
 * - Targets <300KB for WhatsApp compatibility
 * - Tracks file hashes to skip unchanged images
 */

import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import { glob } from "glob";
import matter from "gray-matter";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const MEDIA_DIR = path.join(SRC_DIR, "media");
const OG_DIR = path.join(MEDIA_DIR, "og");
const TRACKING_FILE = path.join(OG_DIR, ".og-tracking.json");
const MAX_SIZE_BYTES = 300 * 1024; // 300KB target for WhatsApp
const OG_WIDTH = 1200;

/**
 * Load tracking data from previous run.
 */
async function loadTracking() {
  if (await fs.pathExists(TRACKING_FILE)) {
    try {
      return await fs.readJson(TRACKING_FILE);
    } catch {
      console.log("[og] Could not load tracking file, starting fresh");
    }
  }
  return {};
}

/**
 * Compute MD5 hash of a file for change detection.
 */
async function fileHash(filePath) {
  const data = await fs.readFile(filePath);
  return createHash("md5").update(data).digest("hex");
}

/**
 * Find the actual source file in src/media/ for a given base name.
 * Handles URL-encoded filenames and case variations.
 */
async function findSourceFile(baseName) {
  const mediaFiles = await fs.readdir(MEDIA_DIR);
  for (const file of mediaFiles) {
    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".gif"].includes(ext)) continue;
    const name = path.basename(file, path.extname(file));
    // Compare decoded versions for URL-encoded filenames
    if (
      name === baseName ||
      decodeURIComponent(name) === decodeURIComponent(baseName)
    ) {
      return file;
    }
  }
  return null;
}

/**
 * Generate a single OG preview image, iteratively reducing quality/size
 * to stay under the target file size.
 */
async function generateSingleOgImage(sourcePath, outputPath, format) {
  const startQuality = format === "png" ? 80 : 82;
  const minQuality = format === "png" ? 20 : 25;
  const qualityStep = 10;
  let currentWidth = OG_WIDTH;

  // Use rotate() to apply EXIF orientation before processing
  const metadata = await sharp(sourcePath).metadata();
  const isRotated =
    metadata.orientation && [5, 6, 7, 8].includes(metadata.orientation);
  const actualWidth = isRotated ? metadata.height : metadata.width;

  // Don't enlarge images smaller than target width
  if (actualWidth && actualWidth < currentWidth) {
    currentWidth = actualWidth;
  }

  let quality = startQuality;

  while (true) {
    const resized = sharp(sourcePath).rotate().resize(currentWidth, null, {
      withoutEnlargement: true,
      fit: "inside",
    });

    let buffer;
    if (format === "png") {
      buffer = await resized.png({ compressionLevel: 9, quality }).toBuffer();
    } else {
      buffer = await resized.jpeg({ quality, mozjpeg: true }).toBuffer();
    }

    if (buffer.length <= MAX_SIZE_BYTES) {
      await fs.writeFile(outputPath, buffer);
      console.log(
        `[og]   ${path.basename(outputPath)}: ${(buffer.length / 1024).toFixed(0)}KB (${currentWidth}w, q${quality})`,
      );
      return;
    }

    // Try reducing quality first
    if (quality > minQuality) {
      quality -= qualityStep;
      continue;
    }

    // Quality exhausted — reduce dimensions
    quality = startQuality;
    currentWidth = Math.round(currentWidth * 0.8);

    if (currentWidth < 300) {
      // Accept whatever we have at this point
      await fs.writeFile(outputPath, buffer);
      console.log(
        `[og]   ${path.basename(outputPath)}: ${(buffer.length / 1024).toFixed(0)}KB (min size reached)`,
      );
      return;
    }
  }
}

/**
 * Main: scan pages for image frontmatter, generate OG previews.
 */
export async function generateOgImages() {
  console.log("\n========================================");
  console.log("  GENERATING OG PREVIEW IMAGES");
  console.log("========================================\n");

  await fs.ensureDir(OG_DIR);
  const previousTracking = await loadTracking();
  const newTracking = {};

  // Find all markdown files with image frontmatter
  const mdFiles = await glob("**/*.md", { cwd: SRC_DIR, nodir: true });
  const imageSources = new Map(); // baseName -> sourceFilename

  for (const mdFile of mdFiles) {
    const content = await fs.readFile(path.join(SRC_DIR, mdFile), "utf-8");
    const { data } = matter(content);
    if (!data.image) continue;

    // data.image is like /media/og/IMG_7428-og.jpeg
    const ogBasename = path.basename(data.image);
    const match = ogBasename.match(/^(.+)-og\.(jpeg|png|gif)$/);
    if (!match) continue;

    const baseName = decodeURIComponent(match[1]);
    if (imageSources.has(baseName)) continue;

    const sourceFile = await findSourceFile(baseName);
    if (sourceFile) {
      imageSources.set(baseName, sourceFile);
    } else {
      console.log(`[og] Warning: source not found for ${baseName}`);
    }
  }

  console.log(`[og] Found ${imageSources.size} unique images to process\n`);

  let generated = 0;
  let skipped = 0;

  for (const [baseName, sourceFile] of imageSources) {
    const sourcePath = path.join(MEDIA_DIR, sourceFile);
    const hash = await fileHash(sourcePath);
    const ext = path.extname(sourceFile).toLowerCase();
    const isGif = ext === ".gif";
    const outputFormat = isGif ? "gif" : ext === ".png" ? "png" : "jpeg";
    const outputFilename = `${encodeURIComponent(baseName)}-og.${outputFormat}`;
    const outputPath = path.join(OG_DIR, outputFilename);

    newTracking[sourceFile] = hash;

    // Skip if unchanged
    if (
      previousTracking[sourceFile] === hash &&
      (await fs.pathExists(outputPath))
    ) {
      skipped++;
      continue;
    }

    if (isGif) {
      // Copy GIFs as-is to preserve animation
      await fs.copy(sourcePath, outputPath);
      console.log(
        `[og]   ${path.basename(outputPath)}: copied as-is (GIF, ${((await fs.stat(sourcePath)).size / 1024).toFixed(0)}KB)`,
      );
    } else {
      await generateSingleOgImage(sourcePath, outputPath, outputFormat);
    }
    generated++;
  }

  // Clean up orphaned OG images
  let cleaned = 0;
  if (await fs.pathExists(OG_DIR)) {
    const existingOg = await fs.readdir(OG_DIR);
    const activeOutputs = new Set(
      [...imageSources.entries()].map(([baseName, sourceFile]) => {
        const ext = path.extname(sourceFile).toLowerCase();
        const fmt = ext === ".gif" ? "gif" : ext === ".png" ? "png" : "jpeg";
        return `${encodeURIComponent(baseName)}-og.${fmt}`;
      }),
    );

    for (const file of existingOg) {
      if (file.startsWith(".")) continue; // skip tracking file
      if (!activeOutputs.has(file)) {
        await fs.remove(path.join(OG_DIR, file));
        console.log(`[og] Cleaned orphan: ${file}`);
        cleaned++;
      }
    }
  }

  // Save tracking
  await fs.writeJson(TRACKING_FILE, newTracking, { spaces: 2 });

  console.log("\n========================================");
  console.log("  OG IMAGES COMPLETE");
  console.log("========================================");
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped (unchanged): ${skipped}`);
  console.log(`  Cleaned orphans: ${cleaned}`);
  console.log("========================================\n");
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateOgImages().catch((error) => {
    console.error("OG image generation failed:", error.message);
    process.exit(1);
  });
}
