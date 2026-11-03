import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import sharp from "sharp";
import { bakeMarbles } from "../../scripts/bake-marbles.js";

let src;
beforeAll(async () => {
  src = await fs.mkdtemp(path.join(os.tmpdir(), "bake-"));
  await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 200, g: 60, b: 40 } } }).png().toFile(path.join(src, "og-photo.png"));
  await fs.ensureDir(path.join(src, "og"));
  await fs.move(path.join(src, "og-photo.png"), path.join(src, "og", "photo-og.png"));
  await fs.outputJson(path.join(src, "graph.json"), {
    nodes: [
      { id: "/marbles/with-photo/", type: "page", shape: "marble", image: "/og/photo-og.png", color: "#888888" },
      { id: "/marbles/plain/", type: "page", shape: "marble", color: "#3366aa" },
      { id: "/notes/n/", type: "page", shape: "note" },
    ],
    links: [],
  });
});
afterAll(() => fs.remove(src));

describe("bakeMarbles", () => {
  it("writes the picture, a room size and two icon sizes for every marble, and nothing for other pages", async () => {
    const written = await bakeMarbles({ srcDir: src });
    expect(written.sort()).toEqual([
      "og/marble/marbles--plain-256.png", "og/marble/marbles--plain-32.png", "og/marble/marbles--plain-64.png", "og/marble/marbles--plain.png",
      "og/marble/marbles--with-photo-256.png", "og/marble/marbles--with-photo-32.png", "og/marble/marbles--with-photo-64.png", "og/marble/marbles--with-photo.png",
    ]);
    const meta = await sharp(path.join(src, "og/marble/marbles--plain.png")).metadata();
    expect([meta.width, meta.height, meta.hasAlpha]).toEqual([512, 512, true]); // sharp on a retina screen
  });

  it("the photo shows through the glass of a photo marble", async () => {
    const { data } = await sharp(path.join(src, "og/marble/marbles--with-photo.png")).raw().toBuffer({ resolveWithObject: true });
    const center = (256 * 512 + 256) * 4;
    expect(data[center]).toBeGreaterThan(data[center + 2]); // red photo, not blue
  });

  it("nothing is drawn outside the ball (the shine stays on the glass)", async () => {
    const { data } = await sharp(path.join(src, "og/marble/marbles--plain.png")).raw().toBuffer({ resolveWithObject: true });
    let outside = 0;
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++)
      if (Math.hypot(x + 0.5 - 256, y + 0.5 - 256) > 257 && data[(y * 512 + x) * 4 + 3] > 0) outside++;
    expect(outside).toBe(0);
  });
});

describe("bakeMarbles reads every engine-drawn marble, listed or not", () => {
  it("bakes an unlisted marble named in the build data, and survives a bad picture", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bake2-"));
    await fs.outputJson(path.join(dir, "_data", "marblePictures.json"), [
      { id: "/marbles/hidden/", color: "#3366aa" },
      { id: "/marbles/broken/", image: "/og/broken.png", color: "#3366aa" },
    ]);
    await fs.outputFile(path.join(dir, "og", "broken.png"), "not a picture");
    const written = await bakeMarbles({ srcDir: dir });
    expect(written).toContain("og/marble/marbles--hidden.png");
    expect(written).toContain("og/marble/marbles--broken.png");
    await fs.remove(dir);
  });
});

describe("room pictures leave the glare to the room", () => {
  it("the room size is baked without the highlight (the room draws a live one)", async () => {
    const big = await sharp(path.join(src, "og/marble/marbles--plain.png")).resize(256, 256).raw().toBuffer();
    const room = await sharp(path.join(src, "og/marble/marbles--plain-256.png")).raw().toBuffer();
    const peak = (b) => { let m = 0; for (let i = 0; i < b.length; i += 4) m = Math.max(m, b[i] + b[i + 1] + b[i + 2]); return m; };
    expect(peak(room)).toBeLessThan(peak(big) - 20);
  });
});
