/**
 * Bakes every marble into a picture when the site builds: the glass (with the marble's picture
 * inside, or its own color), its highlight and pearly sheen drawn by the glass, at 512 px plus 256, 64 and 32 px
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
import { glassMap, glassDraw, burnIn, pearlSheen, GLASS } from "../lib/visualizers/marble/glass.js";
import { insideColor, hexToRgb, normalizeHex } from "../lib/visualizers/marble/color.js";
import { closedPicturePath } from "../lib/visualizers/marble/paths.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 512; // sharp on a retina screen; rooms use the 256 copy

export async function bakeMarbles({ srcDir }) {
  // Every marble the engine draws, listed or not (preprocess writes it); else the catalog.
  const dataPath = path.join(srcDir, "_data", "marblePictures.json");
  const graphPath = path.join(srcDir, "graph.json");
  let marbles;
  if (await fs.pathExists(dataPath)) marbles = await fs.readJson(dataPath);
  else if (await fs.pathExists(graphPath)) marbles = ((await fs.readJson(graphPath)).nodes || []).filter((n) => n.shape === "marble");
  else return [];
  if (!marbles.length) return [];

  const map = glassMap(SIZE);
  const shine = pearlSheen(map);
  // Rooms draw a live glare that follows the light as marbles move, so their size is baked
  // without the highlight.
  const ROOM = 256;
  const roomMap = glassMap(ROOM);
  const roomShine = pearlSheen(roomMap);
  const written = [];
  for (const node of marbles) {
    const picture = await insidePicture(node, srcDir);
    const glass = glassDraw(picture.data, picture.width, picture.height, map, {
      seeMiddle: picture.isPhoto ? GLASS.seeImage : GLASS.seeColor,
      seeEdge: GLASS.seeEdge,
    });
    burnIn(glass, shine, map.cover, GLASS.shine);
    const png = await sharp(Buffer.from(glass), { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
    const roomGlass = glassDraw(picture.data, picture.width, picture.height, roomMap, {
      seeMiddle: picture.isPhoto ? GLASS.seeImage : GLASS.seeColor,
      seeEdge: GLASS.seeEdge,
      specular: 0,
    });
    burnIn(roomGlass, roomShine, roomMap.cover, GLASS.shine);
    const roomPng = await sharp(Buffer.from(roomGlass), { raw: { width: ROOM, height: ROOM, channels: 4 } }).png().toBuffer();
    for (const size of [undefined, ROOM, 64, 32]) {
      const rel = closedPicturePath(node.id, size).replace(/^\//, "");
      const out = path.join(srcDir, rel);
      await fs.ensureDir(path.dirname(out));
      if (size === ROOM) await sharp(roomPng).png().toFile(out);
      else await (size ? sharp(png).resize(size, size) : sharp(png)).png().toFile(out);
      written.push(rel);
    }
  }
  console.log(`[bake-marbles] ${marbles.length} marble(s) baked`);
  return written;
}

async function insidePicture(node, srcDir) {
  if (node.image) {
    const file = path.join(srcDir, decodeURIComponent(node.image).replace(/^\//, ""));
    if (await fs.pathExists(file)) try {
      const { data, info } = await sharp(file).resize(SIZE, SIZE, { fit: "cover" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { data: new Uint8ClampedArray(data), width: info.width, height: info.height, isPhoto: true };
    } catch (e) {
      console.warn(`[bake-marbles] ${node.id}: its picture can't be read (${e.message}); using its color`);
    }
  }
  return { data: insideColor(hexToRgb(normalizeHex(node.color) || "#9a8fe0"), SIZE), width: SIZE, height: SIZE, isPhoto: false };
}
