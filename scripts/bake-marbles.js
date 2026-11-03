/**
 * Bakes every marble into a picture when the site builds: the glass (with the marble's picture
 * inside, or its own color), the pearl shine turned toward the sun, at 256 px plus 64 and 32 px
 * icons. Used where script doesn't run, as the link preview, and as the page's tab icon. The
 * browser draws the live glass on top.
 *
 * Runs after the link-preview images exist (it reads them as the marbles' pictures). The glass
 * math is the marble's own pure functions; this file only reads and writes images.
 */
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { glassMap, glassDraw, GLASS } from "../lib/visualizers/marble/glass.js";
import { insideColor, hexToRgb } from "../lib/visualizers/marble/color.js";
import { closedPicturePath } from "../lib/visualizers/marble/paths.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PEARL = path.join(ROOT, "lib/visualizers/marble/assets/pearl.png");
const SIZE = 256;
const SUN_ANGLE = 45; // top right, as the room's light by day

export async function bakeMarbles({ srcDir }) {
  const graphPath = path.join(srcDir, "graph.json");
  if (!(await fs.pathExists(graphPath))) return [];
  const { nodes = [] } = await fs.readJson(graphPath);
  const marbles = nodes.filter((n) => n.shape === "marble");
  if (!marbles.length) return [];

  const map = glassMap(SIZE);
  const shine = await pearlShine();
  const written = [];
  for (const node of marbles) {
    const picture = await insidePicture(node, srcDir);
    const glass = glassDraw(picture.data, picture.width, picture.height, map, {
      seeMiddle: picture.isPhoto ? GLASS.seeImage : GLASS.seeColor,
      seeEdge: GLASS.seeEdge,
    });
    addShine(glass, shine, map.cover);
    const png = await sharp(Buffer.from(glass), { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
    for (const size of [undefined, 64, 32]) {
      const rel = closedPicturePath(node.id, size).replace(/^\//, "");
      const out = path.join(srcDir, rel);
      await fs.ensureDir(path.dirname(out));
      await (size ? sharp(png).resize(size, size) : sharp(png)).png().toFile(out);
      written.push(rel);
    }
  }
  console.log(`[bake-marbles] ${marbles.length} marble(s) baked`);
  return written;
}

async function insidePicture(node, srcDir) {
  if (node.image) {
    const file = path.join(srcDir, decodeURIComponent(node.image).replace(/^\//, ""));
    if (await fs.pathExists(file)) {
      const { data, info } = await sharp(file).resize(SIZE, SIZE, { fit: "cover" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { data: new Uint8ClampedArray(data), width: info.width, height: info.height, isPhoto: true };
    }
  }
  return { data: insideColor(hexToRgb(node.color || "#9a8fe0"), SIZE), width: SIZE, height: SIZE, isPhoto: false };
}

// Lays the shine on the glass (screen), only where the ball is.
function addShine(glass, shine, cover) {
  for (let i = 0; i < cover.length; i++) {
    const c = cover[i];
    if (!c) continue;
    const o = i * 4, a = (shine[o + 3] / 255) * c;
    if (!a) continue;
    for (let k = 0; k < 3; k++) glass[o + k] = 255 - ((255 - glass[o + k]) * (255 - shine[o + k] * a)) / 255;
    glass[o + 3] = glass[o + 3] + (255 * c - glass[o + 3]) * a;
  }
}

// The pearl's highlight, turned toward the sun, at the shine strength Leon tuned (raw RGBA).
async function pearlShine() {
  const turned = await sharp(PEARL)
    .resize(SIZE, SIZE)
    .rotate(SUN_ANGLE - GLASS.naturalHighlightDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = turned.data;
  for (let i = 3; i < px.length; i += 4) px[i] = Math.round(px[i] * GLASS.shine);
  return px;
}
