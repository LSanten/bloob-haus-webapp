// Generates an optimized site background image from `background_image` in _bloob-settings.md.
// Mirrors generate-favicons.js: hash-cached, runs inside assemble-src after preprocessing.
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { glob } from "glob";

const OUT_REL = path.join("media", "optimized", "site-background.webp");
const OUT_URL = "/media/optimized/site-background.webp";
const HASH_FILE = ".background-hash";
const MAX_WIDTH = 1920;
const QUALITY = 80;

/** Resolve [[wiki]], [alt](path), or plain path to an absolute file under srcDir, or null. */
async function resolveSourceFile(value, srcDir) {
  if (!value) return null;
  const s = String(value).trim();
  const wiki = s.match(/^\[\[(.+?)\]\]$/);
  const md = s.match(/^\[.*?\]\((.+?)\)$/);
  let rel = wiki ? wiki[1] : md ? decodeURIComponent(md[1]) : s;
  const direct = path.join(srcDir, rel);
  if (await fs.pathExists(direct)) return direct;
  const matches = await glob(`**/${rel}`, {
    cwd: srcDir, nodir: true,
    ignore: ["_includes/**", "_data/**", "assets/**", "og/**", "media/optimized/**"],
  });
  return matches.length ? path.join(srcDir, matches[0]) : null;
}

export async function generateBackground({ config, srcDir }) {
  const value = config.site?.background_image;
  if (!value) return null;
  const srcFile = await resolveSourceFile(value, srcDir);
  if (!srcFile) {
    console.warn(`[background] background_image not found in src/: ${value}`);
    return null;
  }
  const outFile = path.join(srcDir, OUT_REL);
  const hashFile = path.join(srcDir, HASH_FILE);
  const hash = crypto.createHash("md5").update(await fs.readFile(srcFile)).digest("hex");
  const prev = (await fs.pathExists(hashFile)) ? (await fs.readFile(hashFile, "utf-8")).trim() : null;
  if (prev === hash && (await fs.pathExists(outFile))) return OUT_URL; // cache hit
  await fs.ensureDir(path.dirname(outFile));
  await sharp(srcFile).resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY }).toFile(outFile);
  await fs.writeFile(hashFile, hash);
  console.log(`[background] Wrote ${OUT_REL}`);
  return OUT_URL;
}
