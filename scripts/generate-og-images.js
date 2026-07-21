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
import os from "os";
import { mapWithConcurrency } from "./utils/map-concurrent.js";
import { isMainModule } from "./utils/is-main.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const getSrcDirPath = () => process.env.SRC_DIR || path.join(ROOT_DIR, "src");
const MAX_SIZE_BYTES = 300 * 1024; // 300KB target for WhatsApp
const OG_WIDTH = 1200;

/**
 * How many OG images to resize at once. Sharp/libvips already thread internally,
 * so this is capped to speed cold builds without oversubscribing the CPU.
 *
 * Precedence:
 *   1. OG_CONCURRENCY env — explicit override, always wins.
 *   2. CI (GitHub Actions etc. set CI=true) — a conservative 2. CI runners are
 *      small/shared and containerized builders can MISREPORT core count (report
 *      host cores while capped to 1-2 CPUs + tight memory), so we never scale to
 *      os.cpus() there. 2 is still ~2x the old sequential path, and safe.
 *   3. Local dev — up to 8 (or the machine's cores), where the speedup matters
 *      for authors regenerating a vault's images.
 *
 * Read at call time (not module load) so env vars set by the caller take effect.
 */
function getOgConcurrency() {
  const fromEnv = parseInt(process.env.OG_CONCURRENCY || "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  if (process.env.CI) return 2;
  const cpus = os.cpus()?.length || 4;
  return Math.max(2, Math.min(cpus, 8));
}

/**
 * Load tracking data from previous run.
 */
async function loadTracking(trackingFile) {
  if (await fs.pathExists(trackingFile)) {
    try {
      return await fs.readJson(trackingFile);
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
 * Find the actual source file in src/ for a given base name.
 * Searches the whole src/ tree (vault structure is preserved — images may be
 * anywhere, not just in src/media/).
 * Handles URL-encoded filenames by using glob with decoded baseName.
 */
async function findSourceFile(baseName, srcDir) {
  const decoded = decodeURIComponent(baseName);
  const exts = ["jpg", "jpeg", "png", "gif"];
  for (const ext of exts) {
    const matches = await glob(`**/${decoded}.${ext}`, {
      cwd: srcDir,
      nodir: true,
      ignore: ["og/**", "assets/**", "media/optimized/**"],
    });
    if (matches.length > 0) return matches[0]; // vault-relative path
    // Try URL-encoded variant in case filename contains special chars on disk
    if (decoded !== baseName) {
      const encodedMatches = await glob(`**/${baseName}.${ext}`, {
        cwd: srcDir,
        nodir: true,
        ignore: ["og/**", "assets/**", "media/optimized/**"],
      });
      if (encodedMatches.length > 0) return encodedMatches[0];
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
  const SRC_DIR = getSrcDirPath();
  const MEDIA_DIR = path.join(SRC_DIR, "media");
  const OG_DIR = path.join(SRC_DIR, "og");
  const TRACKING_FILE = path.join(OG_DIR, ".og-tracking.json");

  console.log("\n========================================");
  console.log("  GENERATING OG PREVIEW IMAGES");
  console.log("========================================\n");

  await fs.ensureDir(OG_DIR);
  const previousTracking = await loadTracking(TRACKING_FILE);
  const newTracking = {};

  // Find all markdown files with image frontmatter
  const mdFiles = await glob("**/*.md", { cwd: SRC_DIR, nodir: true });
  const imageSources = new Map(); // baseName -> sourceFilename

  for (const mdFile of mdFiles) {
    const content = await fs.readFile(path.join(SRC_DIR, mdFile), "utf-8");
    const { data } = matter(content);
    if (!data.image) continue;

    // data.image is like /og/IMG_7428-og.jpeg
    const ogBasename = path.basename(data.image);
    const match = ogBasename.match(/^(.+)-og\.(jpeg|png|gif)$/);
    if (!match) continue;

    const baseName = decodeURIComponent(match[1]);
    if (imageSources.has(baseName)) continue;

    const sourceFile = await findSourceFile(baseName, SRC_DIR);
    if (sourceFile) {
      imageSources.set(baseName, sourceFile); // vault-relative path within SRC_DIR
    } else {
      console.log(`[og] Warning: source not found for ${baseName}`);
    }
  }

  console.log(`[og] Found ${imageSources.size} unique images to process\n`);

  // Process images with bounded concurrency (sharp is CPU-bound; sequential
  // left most cores idle on cold builds). Each task is independent — it reads
  // one source and writes one OG file — so the only shared state is collected
  // from the returned outcomes afterward, never mutated concurrently.
  const concurrency = getOgConcurrency();
  console.log(`[og] Processing with concurrency ${concurrency}\n`);

  const outcomes = await mapWithConcurrency(
    [...imageSources.entries()],
    concurrency,
    async ([baseName, sourceFile]) => {
      const sourcePath = path.join(SRC_DIR, sourceFile);
      const hash = await fileHash(sourcePath);
      const ext = path.extname(sourceFile).toLowerCase();
      // GIFs → extract first frame as JPEG (animated GIFs are too large for OG;
      // sharp reads frame 0 by default when resizing, so no extra config needed).
      const outputFormat = ext === ".png" ? "png" : "jpeg";
      // Filename on disk uses raw characters (spaces, @, etc.) — NOT URL-encoded.
      // The URL in frontmatter is encodeURIComponent'd, so browser decodes it back
      // to the raw name, which the static server then finds on disk.
      const outputFilename = `${baseName}-og.${outputFormat}`;
      const outputPath = path.join(OG_DIR, outputFilename);

      // Skip if unchanged
      if (
        previousTracking[sourceFile] === hash &&
        (await fs.pathExists(outputPath))
      ) {
        return { sourceFile, hash, status: "skipped" };
      }

      await generateSingleOgImage(sourcePath, outputPath, outputFormat);
      return { sourceFile, hash, status: "generated" };
    },
  );

  let generated = 0;
  let skipped = 0;
  for (const { sourceFile, hash, status } of outcomes) {
    newTracking[sourceFile] = hash;
    if (status === "generated") generated++;
    else skipped++;
  }

  // Clean up orphaned OG images
  let cleaned = 0;
  if (await fs.pathExists(OG_DIR)) {
    const existingOg = await fs.readdir(OG_DIR);
    const activeOutputs = new Set(
      [...imageSources.entries()].map(([baseName, sourceFile]) => {
        const ext = path.extname(sourceFile).toLowerCase();
        const fmt = ext === ".png" ? "png" : "jpeg";
        return `${baseName}-og.${fmt}`;
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
if (isMainModule(import.meta.url)) {
  generateOgImages().catch((error) => {
    console.error("OG image generation failed:", error.message);
    process.exit(1);
  });
}
