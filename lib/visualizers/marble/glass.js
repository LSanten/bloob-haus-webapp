/**
 * The marble's glass, as pure functions: pixels in, pixels out, no DOM and no files. The same
 * code bakes each marble when the site builds and draws it live in the browser.
 *
 * Every pixel of the ball is a ray of light that enters the glass, bends (Snell's law, once per
 * color channel for a faint rainbow at the edge) and lands on the picture at the ball's center.
 */

// Leon's tuned values (2026-11-02, from the marble prototype's sliders).
export const GLASS = {
  strength: 1.05, // how strongly the glass bends
  zoom: 0.91, // how much of the picture the ball sees
  rainbow: 0.04, // rainbow at the edge
  rim: 0.57, // light at the rim
  shine: 0.43, // the pearl shine on top (a setting)
  seeImage: 0.2, // see-through in the middle, marble with a picture
  seeColor: 0.77, // see-through in the middle, marble without a picture
  seeEdge: 0, // see-through at the edge
  movement: 0.4, // how much the picture moves as the page scrolls
  naturalHighlightDeg: -30, // where the pearl picture's own highlight points
};

/** Where every pixel's light lands, computed once per size and glass. */
export function glassMap(size, strength = GLASS.strength, rainbow = GLASS.rainbow) {
  const R = size / 2, n = size * size;
  const map = new Float32Array(n * 6), rim = new Float32Array(n), cover = new Float32Array(n);
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
      cover[i] = Math.max(0, Math.min(1, ((1 - Math.sqrt(rr)) * R) / 1.25)); // soft, anti-aliased edge
    }
  }
  return { size, map, rim, cover };
}

/**
 * Reads the picture through the glass. shiftX/shiftY move what the ball sees (scrolling).
 * @returns {Uint8ClampedArray} RGBA, size x size
 */
export function glassDraw(src, sw, sh, g, opts = {}, shiftX = 0, shiftY = 0) {
  const { seeMiddle = GLASS.seeImage, seeEdge = GLASS.seeEdge, zoom = GLASS.zoom, rim = GLASS.rim } = opts;
  const size = g.size, out = new Uint8ClampedArray(size * size * 4);
  const half = (Math.min(sw, sh) * zoom) / 2, cx = sw / 2, cy = sh / 2;
  for (let i = 0, n = size * size; i < n; i++) {
    const cov = g.cover[i];
    if (!cov) continue;
    const rr = g.rim[i], o4 = i * 4;
    for (let c = 0; c < 3; c++) {
      let u = (cx + (g.map[i * 6 + c * 2] + shiftX) * half) | 0;
      let v = (cy + (g.map[i * 6 + c * 2 + 1] + shiftY) * half) | 0;
      if (u < 0) u = -u; if (u >= sw) u = 2 * sw - u - 2; // mirror at the picture's edge
      if (v < 0) v = -v; if (v >= sh) v = 2 * sh - v - 2;
      if (u < 0) u = 0; else if (u >= sw) u = sw - 1;
      if (v < 0) v = 0; else if (v >= sh) v = sh - 1;
      const val = src[(v * sw + u) * 4 + c];
      out[o4 + c] = val + (255 - val) * rim * rr * rr; // glass gets lighter toward the rim
    }
    const see = seeMiddle + (seeEdge - seeMiddle) * rr;
    out[o4 + 3] = 255 * cov * (1 - see);
  }
  return out;
}
