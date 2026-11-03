/**
 * The marble's glass, as pure functions: pixels in, pixels out, no DOM and no files. The same
 * code bakes each marble when the site builds and draws it live in the browser.
 *
 * Every pixel of the ball is a ray of light that enters the glass, bends (Snell's law, once per
 * color channel for a faint rainbow at the edge) and lands on the picture at the ball's center.
 */

// Leon's tuned values (2026-11-02, from the marble prototype's sliders), then that evening:
// "the rainbow effect should be much less", the pearl "stronger, maybe burnt into it", the
// picture "a bit lighter or more transparent", "more real like a sphere".
export const GLASS = {
  strength: 1.05, // how strongly the glass bends
  zoom: 0.91, // how much of the picture the ball sees
  rainbow: 0.012, // rainbow at the edge (was 0.04)
  rim: 0.57, // light at the rim
  shine: 0.6, // the pearl, burnt into the glass (was 0.43, laid on top)
  seeImage: 0.3, // see-through in the middle, marble with a picture (was 0.20)
  seeColor: 0.77, // see-through in the middle, marble without a picture
  seeEdge: 0, // see-through at the edge
  lift: 0.14, // the picture made lighter, toward white
  shade: 0.34, // the side away from the light darkens: a sphere
  specular: 0.9, // the bright highlight where the light reflects toward you
  movement: 0.4, // how much the picture moves as the page scrolls
};

// The light comes from the top right, toward the viewer.
const LIGHT = (() => {
  const v = [0.55, -0.55, 0.63], n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

/** Where every pixel's light lands, computed once per size and glass. */
export function glassMap(size, strength = GLASS.strength, rainbow = GLASS.rainbow) {
  const R = size / 2, n = size * size;
  const map = new Float32Array(n * 6), rim = new Float32Array(n), cover = new Float32Array(n), facing = new Float32Array(n), gloss = new Float32Array(n);
  const etas = [1 / (strength * (1 - rainbow)), 1 / strength, 1 / (strength * (1 + rainbow))];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x, nx = (x + 0.5 - R) / R, ny = (y + 0.5 - R) / R, rr = nx * nx + ny * ny;
      if (rr >= 1) continue;
      const nz = Math.sqrt(1 - rr);
      for (let c = 0; c < 3; c++) {
        const e = etas[c], m = e * nz - Math.sqrt(1 - e * e * (1 - nz * nz));
        const tx = m * nx, ty = m * ny, tz = -e + m * nz, s = -nz / tz;
        map[i * 6 + c * 2] = nx + s * tx;
        map[i * 6 + c * 2 + 1] = ny + s * ty;
      }
      rim[i] = rr;
      const nl = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      facing[i] = 0.5 + 0.5 * nl; // 1 toward the light
      const rz = Math.max(0, 2 * nl * nz - LIGHT[2]); // the reflected light, toward the viewer
      gloss[i] = Math.min(1, Math.pow(rz, 60) + 0.22 * Math.pow(rz, 7)); // a sharp spot and a soft sheen
      cover[i] = Math.max(0, Math.min(1, ((1 - Math.sqrt(rr)) * R) / 1.25)); // soft, anti-aliased edge
    }
  }
  return { size, map, rim, cover, facing, gloss };
}

/**
 * Reads the picture through the glass. shiftX/shiftY move what the ball sees (scrolling).
 * @returns {Uint8ClampedArray} RGBA, size x size
 */
export function glassDraw(src, sw, sh, g, opts = {}, shiftX = 0, shiftY = 0) {
  const { seeMiddle = GLASS.seeImage, seeEdge = GLASS.seeEdge, zoom = GLASS.zoom, rim = GLASS.rim, lift = GLASS.lift, shade = GLASS.shade, specular = GLASS.specular } = opts;
  const size = g.size, out = new Uint8ClampedArray(size * size * 4);
  const half = (Math.min(sw, sh) * zoom) / 2, cx = sw / 2, cy = sh / 2;
  for (let i = 0, n = size * size; i < n; i++) {
    const cov = g.cover[i];
    if (!cov) continue;
    const rr = g.rim[i], o4 = i * 4, light = 1 - shade * (1 - g.facing[i]), spot = g.gloss[i] * specular;
    for (let c = 0; c < 3; c++) {
      let u = (cx + (g.map[i * 6 + c * 2] + shiftX) * half) | 0;
      let v = (cy + (g.map[i * 6 + c * 2 + 1] + shiftY) * half) | 0;
      if (u < 0) u = -u; if (u >= sw) u = 2 * sw - u - 2; // mirror at the picture's edge
      if (v < 0) v = -v; if (v >= sh) v = 2 * sh - v - 2;
      if (u < 0) u = 0; else if (u >= sw) u = sw - 1;
      if (v < 0) v = 0; else if (v >= sh) v = sh - 1;
      let val = src[(v * sw + u) * 4 + c];
      val += (255 - val) * lift; // a lighter picture
      val += (255 - val) * rim * rr * rr; // glass gets lighter toward the rim
      val *= light; // and darker away from the light
      out[o4 + c] = val + (255 - val) * spot; // the highlight
    }
    const see = seeMiddle + (seeEdge - seeMiddle) * rr;
    out[o4 + 3] = 255 * cov * Math.max(1 - see, spot);
  }
  return out;
}

/**
 * A faint pearly sheen, strongest toward the edge (as glass reflects more at a slant), its hue
 * drifting softly around the ball. RGBA, the size of the glass map; burnt in with burnIn.
 */
export function pearlSheen(g) {
  const { size, rim, cover, facing } = g, out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (!cover[i]) continue;
      const hue = 205 + 70 * facing[i] + 25 * Math.sin(Math.atan2(y - size / 2, x - size / 2) * 2);
      const [r, gr, b] = hsl(hue, 0.35, 0.82), o = i * 4;
      out[o] = r; out[o + 1] = gr; out[o + 2] = b;
      out[o + 3] = 255 * Math.pow(rim[i], 1.6) * 0.85;
    }
  }
  return out;
}

function hsl(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

/**
 * Burns the pearl into the glass (an overlay blend: its darks deepen, its lights brighten), only
 * where the ball is. Changes `glass` in place. Both pictures are RGBA of the same size.
 */
export function burnIn(glass, shine, cover, strength = GLASS.shine) {
  for (let i = 0; i < cover.length; i++) {
    const c = cover[i];
    if (!c) continue;
    const o = i * 4, a = (shine[o + 3] / 255) * c * strength;
    if (!a) continue;
    for (let k = 0; k < 3; k++) {
      const b = glass[o + k], s = shine[o + k];
      const blended = b < 128 ? (2 * b * s) / 255 : 255 - (2 * (255 - b) * (255 - s)) / 255;
      glass[o + k] = b + (blended - b) * a;
    }
    glass[o + 3] = glass[o + 3] + (255 * c - glass[o + 3]) * a * 0.5;
  }
}
