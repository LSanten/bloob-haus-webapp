// Generates an optimized site background image from `background_image` in _bloob-settings.md.
// Mirrors generate-favicons.js: hash-cached, runs inside assemble-src after preprocessing.
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { glob } from "glob";
import matter from "gray-matter";

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

// --- Per-page background overrides -------------------------------------------------
// A page can set `background_image: "[[file]]"` (or a markdown/plain path) in its
// frontmatter to override the site-wide background. Each unique referenced image is
// optimized to a CONTENT-HASHED webp (identical images dedupe to one file, and the hash
// name doubles as the cache key). Returns a { rawFrontmatterValue: url } map that
// assemble-src.js exposes as site.backgroundImages, which themes resolve per page.

const PAGE_OUT_DIR_REL = path.join("media", "optimized");

/** Optimize one source file to media/optimized/bg-<md5>.webp; returns its URL (cached). */
async function optimizeToHashedWebp(srcFile, srcDir) {
  const hash = crypto.createHash("md5").update(await fs.readFile(srcFile)).digest("hex");
  const outRel = path.join(PAGE_OUT_DIR_REL, `bg-${hash}.webp`);
  const outUrl = "/" + outRel.split(path.sep).join("/");
  const outFile = path.join(srcDir, outRel);
  if (await fs.pathExists(outFile)) return outUrl; // content-hash filename == cache hit
  await fs.ensureDir(path.dirname(outFile));
  await sharp(srcFile)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outFile);
  console.log(`[background] Wrote ${outRel}`);
  return outUrl;
}

/**
 * Scan every content page in srcDir for a `background_image` frontmatter override,
 * optimize each unique value, and return a { value: url } map. Purely additive: pages
 * without the key are absent from the map, and themes fall back to site.backgroundImage.
 */
export async function generatePageBackgrounds({ srcDir }) {
  const map = {};
  const files = await glob("**/*.md", {
    cwd: srcDir, nodir: true,
    ignore: ["_includes/**", "_data/**", "assets/**"],
  });
  for (const rel of files) {
    let data;
    try {
      data = matter(await fs.readFile(path.join(srcDir, rel), "utf-8")).data;
    } catch {
      continue; // unparseable frontmatter — skip, don't fail the build
    }
    const value = data && data.background_image;
    if (!value || typeof value !== "string") continue;
    const key = value.trim();
    if (map[key]) continue; // already optimized this exact reference
    const srcFile = await resolveSourceFile(key, srcDir);
    if (!srcFile) {
      console.warn(`[background] page background_image not found in src/: ${key} (${rel})`);
      continue;
    }
    map[key] = await optimizeToHashedWebp(srcFile, srcDir);
  }
  return map;
}
