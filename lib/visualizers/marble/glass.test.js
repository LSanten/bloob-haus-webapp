import { describe, it, expect } from "vitest";
import { glassMap, glassDraw, burnIn, pearlSheen, lightFrom, lightToward, GLASS } from "./glass.js";
import { insideColor, defaultMarbleColor } from "./color.js";

// A test photo: left half red, right half blue, a green dot in the middle.
function photo(w = 64, h = 64) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, mid = Math.abs(x - w / 2) < 3 && Math.abs(y - h / 2) < 3;
    px[i] = mid ? 0 : x < w / 2 ? 255 : 0; px[i + 1] = mid ? 255 : 0; px[i + 2] = mid ? 0 : x < w / 2 ? 0 : 255; px[i + 3] = 255;
  }
  return px;
}
const at = (out, size, x, y) => Array.from(out.slice((y * size + x) * 4, (y * size + x) * 4 + 4));
const luminance = (px) => { let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11; return s / (px.length / 4); };

describe("the glass", () => {
  it("uses Leon's tuned values", () => {
    expect(GLASS).toMatchObject({ zoom: 0.91, rim: 0.57, seeColor: 0.77, seeEdge: 0, movement: 0.4 });
  });

  it("Leon, 2026-11-02 evening: much less rainbow, a stronger burnt-in shine, a lighter, more see-through picture", () => {
    expect(GLASS.rainbow).toBeLessThanOrEqual(0.015);
    expect(GLASS.shine).toBeGreaterThan(0.43);
    expect(GLASS.seeImage).toBeGreaterThan(0.2);
    expect(GLASS.lift).toBeGreaterThan(0);
  });

  it("no swirl from the old marble picture (Leon, 2026-11-03); the drawn sheen and highlight stay", () => {
    expect(GLASS.pearl).toBeUndefined();
    expect(GLASS.shine).toBeGreaterThan(0);
    expect(GLASS.specular).toBeGreaterThan(0);
  });

  it("shading makes it a sphere: the side away from the light is darker", () => {
    const size = 48, g = glassMap(size), grey = new Uint8ClampedArray(64 * 64 * 4).fill(160);
    const out = glassDraw(grey, 64, 64, g, { seeMiddle: 0, rim: 0, lift: 0 });
    const lit = at(out, size, 40, 14)[0], away = at(out, size, 8, 34)[0];
    expect(lit).toBeGreaterThan(away + 15);
  });

  it("the ball's center looks at the photo's center", () => {
    const size = 48, g = glassMap(size);
    const out = glassDraw(photo(), 64, 64, g, { seeMiddle: 0, seeEdge: 0 });
    const [r, gr, b] = at(out, size, 24, 24);
    expect(gr).toBeGreaterThan(200);
    expect(r).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  });

  it("outside the ball is clear", () => {
    const size = 48;
    expect(at(glassDraw(photo(), 64, 64, glassMap(size), {}), size, 0, 0)[3]).toBe(0);
  });

  it("see-through in the middle lets the room show through", () => {
    const size = 48, g = glassMap(size);
    const solid = at(glassDraw(photo(), 64, 64, g, { seeMiddle: 0 }), size, 24, 24)[3];
    const clear = at(glassDraw(photo(), 64, 64, g, { seeMiddle: 0.77 }), size, 24, 24)[3];
    expect(clear).toBeLessThan(solid);
  });

  it("moving shifts what the ball sees", () => {
    const size = 48, g = glassMap(size);
    const still = at(glassDraw(photo(), 64, 64, g, {}), size, 24, 24);
    const moved = at(glassDraw(photo(), 64, 64, g, {}, 0.6, 0), size, 24, 24);
    expect(moved).not.toEqual(still);
  });
});

describe("a marble's own color", () => {
  it("a named color wins", () => expect(defaultMarbleColor({ color: "#123456", title: "x", fileName: "x" })).toBe("#123456"));
  it("an image marble takes the image's average color", () =>
    expect(defaultMarbleColor({ imageAverage: [200, 100, 50], title: "x", fileName: "x" })).toBe("#c86432"));
  it("no image and no title still gives a steady color", () => {
    const a = defaultMarbleColor({ fileName: "AUTOPOIESIS-A" });
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(defaultMarbleColor({ fileName: "AUTOPOIESIS-A" })).toBe(a);
  });
  it("different titles give different colors", () =>
    expect(defaultMarbleColor({ title: "Autopoiesis", fileName: "a" })).not.toBe(defaultMarbleColor({ title: "Pricing", fileName: "a" })));
  it("a darker pick makes a darker marble", () =>
    expect(luminance(insideColor([30, 50, 110], 32))).toBeLessThan(luminance(insideColor([170, 190, 240], 32))));
});

describe("burnIn", () => {
  it("blends the shine into the glass only where the ball is", () => {
    const size = 32, g = glassMap(size);
    const glass = new Uint8ClampedArray(size * size * 4).fill(120);
    for (let i = 0; i < size * size; i++) if (!g.cover[i]) glass[i * 4 + 3] = 0;
    const shine = new Uint8ClampedArray(size * size * 4).fill(230);
    const before = glass.slice();
    burnIn(glass, shine, g.cover, 0.6);
    expect(glass[(16 * size + 16) * 4]).not.toBe(before[(16 * size + 16) * 4]);
    expect(glass[3]).toBe(0);
    expect(glass[0]).toBe(120);
  });
});

describe("the glass's own light", () => {
  const size = 48, g = glassMap(size), grey = new Uint8ClampedArray(64 * 64 * 4).fill(120);
  it("a bright highlight sits where the light reflects toward the viewer", () => {
    const out = glassDraw(grey, 64, 64, g, { seeMiddle: 0, rim: 0, lift: 0, shade: 0 });
    let best = 0, bx = 0, by = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const v = at(out, size, x, y)[0]; if (v > best) { best = v; bx = x; by = y; } }
    expect(bx).toBeGreaterThan(size / 2); // up and to the right of the centre
    expect(by).toBeLessThan(size / 2);
    expect(best).toBeGreaterThan(at(out, size, 10, 38)[0] + 60);
  });
  it("the pearly sheen is a picture of the ball's size, clear outside it, strongest toward the edge", () => {
    const sheen = pearlSheen(g);
    expect(sheen.length).toBe(size * size * 4);
    expect(at(sheen, size, 0, 0)[3]).toBe(0);
    expect(at(sheen, size, 4, 24)[3]).toBeGreaterThan(at(sheen, size, 24, 24)[3]);
  });
});

describe("a color that isn't one", () => {
  it("a short hex is expanded", () => expect(defaultMarbleColor({ color: "#abc", fileName: "x" })).toBe("#aabbcc"));
  it("a word, a number or nonsense falls back to the steady color", () => {
    const steady = defaultMarbleColor({ title: "T", fileName: "x" });
    for (const color of ["red", 123, "#12", "url(x)"]) expect(defaultMarbleColor({ color, title: "T", fileName: "x" })).toBe(steady);
  });
});

describe("the light at the top right corner", () => {
  const brightest = (g) => { let best = -1, at = 0; g.gloss.forEach((v, i) => { if (v > best) { best = v; at = i; } }); return { x: at % g.size, y: Math.floor(at / g.size) }; };
  it("a marble low on the left sees the light up and to its right", () => {
    const l = lightFrom({ cx: 100, cy: 700, width: 1200, height: 800 });
    expect(l[0]).toBeGreaterThan(0);
    expect(l[1]).toBeLessThan(0);
    expect(Math.hypot(...l)).toBeCloseTo(1, 5);
  });
  it("the highlight moves to where the light is", () => {
    const g = glassMap(64);
    lightToward(g, lightFrom({ cx: 100, cy: 700, width: 1200, height: 800 }));
    const fromLowLeft = brightest(g);
    lightToward(g, lightFrom({ cx: 1150, cy: 60, width: 1200, height: 800 }));
    const rightUnder = brightest(g);
    expect(fromLowLeft.x).toBeGreaterThan(32); // up and right of the centre
    expect(fromLowLeft.y).toBeLessThan(32);
    expect(Math.hypot(rightUnder.x - 32, rightUnder.y - 32)).toBeLessThan(Math.hypot(fromLowLeft.x - 32, fromLowLeft.y - 32)); // right under the light: nearly head-on
  });
});

describe("the warp", () => {
  it("bends a little more than before (Leon, 2026-11-03), the same cost: the map is made once", () => {
    expect(GLASS.strength).toBeGreaterThan(1.05);
    expect(GLASS.strength).toBeLessThan(1.2);
  });
});
