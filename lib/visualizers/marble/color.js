/**
 * A marble's own color and, when it has no picture, what fills its glass. Pure.
 */

export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hsl(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

export function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

export const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * The color a note names, else its picture's average color, else a steady color from its title,
 * else from its file name. The same note always gets the same color.
 */
export function defaultMarbleColor({ color, title, fileName, imageAverage } = {}) {
  const named = normalizeHex(color);
  if (named) return named;
  if (imageAverage) return toHex(imageAverage);
  return toHex(hsl(hash(title || fileName || "") % 360, 0.62, 0.64));
}

/** What fills a marble without a picture: the whole color counts (hue, strength, brightness). */
export function insideColor(rgb, size) {
  const [h, s, l] = toHsl(rgb);
  const inner = hsl(h, s, l + 0.06), outer = hsl(h + 40, s, l - 0.2), ribbon = hsl(h + 180, s * 0.8, 0.62);
  const px = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - size / 2) / (size / 2), dy = (y - size / 2) / (size / 2);
      const r = Math.min(1, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      const band = Math.pow(0.5 + 0.5 * Math.cos(a + r * 2.4), 8) * (1 - r);
      const c = mix(mix(inner, outer, r * r), ribbon, band * 0.7), o = (y * size + x) * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
    }
  }
  return px;
}

/** "#abc" or "#aabbcc" as "#aabbcc"; anything else (a word, a number, nonsense) as null. */
export function normalizeHex(value) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(typeof value === "string" ? value.trim() : "");
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
