/**
 * Generate Bloob Icons
 *
 * Resizes each bloob-object type's image to a small icon (24×24) for use in
 * internal link pills and the connections graph. Preserves transparency.
 *
 * Output: src/assets/objects/bloob-icons/[type]-icon.png
 * URL path convention: /assets/objects/bloob-icons/[type]-icon.png
 *
 * This convention is used by preprocess-content.js when writing bloobIcon paths
 * into graph.json — the actual files are generated here, after theme assets are
 * copied to src/ by assemble-src.js.
 */

import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import { readBloobObjects, parseObjectImageField } from "./utils/bloob-objects-reader.js";
import { ROOT_DIR } from "./utils/config-loader.js";

const ICON_SIZE = 24;
const SRC_DIR = path.join(ROOT_DIR, "src");
const ICON_OUTPUT_SUBPATH = "assets/objects/bloob-icons";

/**
 * Generate 24×24 PNG icons for each bloob-object type.
 * Reads the registry from the content repo, resolves each image to its
 * assembled path in src/, resizes with transparency preservation, and
 * writes to src/assets/objects/bloob-icons/[type]-icon.png.
 *
 * @param {object} options
 * @param {string} options.contentDir - Absolute path to the content repo root
 * @param {string} [options.srcDir] - Absolute path to src/ (defaults to ROOT_DIR/src)
 */
export async function generateBloobIcons({ contentDir, srcDir = SRC_DIR }) {
  if (!contentDir) {
    console.log("[bloob-icons] No contentDir provided — skipping icon generation");
    return;
  }

  const registry = await readBloobObjects(contentDir);
  if (Object.keys(registry).length === 0) {
    console.log("[bloob-icons] Empty registry — no icons to generate");
    return;
  }

  const outputDir = path.join(srcDir, ICON_OUTPUT_SUBPATH);
  await fs.ensureDir(outputDir);

  let generated = 0;
  let skipped = 0;

  for (const [type, data] of Object.entries(registry)) {
    // Parse image field — handles "none", "default", markdown image syntax, wiki-links, plain URLs
    const relImagePath = parseObjectImageField(data.image);
    if (!relImagePath) continue;

    const imagePath = path.join(srcDir, relImagePath);

    if (!(await fs.pathExists(imagePath))) {
      console.warn(`[bloob-icons] Source not found for "${type}": ${relImagePath}`);
      continue;
    }

    const outputPath = path.join(outputDir, `${type}-icon.png`);

    // Skip if output is newer than source (cache)
    try {
      const srcMtime = (await fs.stat(imagePath)).mtime;
      const outMtime = await fs.stat(outputPath).then((s) => s.mtime).catch(() => null);
      if (outMtime && outMtime >= srcMtime) {
        skipped++;
        continue;
      }
    } catch (_) {}

    await sharp(imagePath)
      .resize(ICON_SIZE, ICON_SIZE, {
        fit: "contain",
        // Transparent padding to preserve aspect ratio without cropping
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);

    console.log(`[bloob-icons] ${type}-icon.png (${ICON_SIZE}×${ICON_SIZE})`);
    generated++;
  }

  console.log(
    `[bloob-icons] Done: ${generated} generated, ${skipped} cached`,
  );
}
