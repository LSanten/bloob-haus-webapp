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
