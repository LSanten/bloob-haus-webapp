/**
 * The graph's look, as pure numbers (Leon, triage 8fbeea84: "Obsidian's graph always looks so
 * good"). Obsidian's own graph is closed source; these follow Quartz's open one (MIT,
 * github.com/jackyzha0/quartz, quartz/components/scripts/graph.inline.ts), which was made to feel
 * like Obsidian's: small nodes that grow with their links, thin quiet lines, labels that fade in
 * as you zoom, and a hover that lights one neighbourhood and dims the rest.
 *
 * Pure: no DOM, so the numbers can be tested and reused by any host.
 */

/** Forces and sizes for the two graphs. World units; the zoom scales them. */
export const GRAPH_LOOK = {
  // gravity pulls every node gently toward the middle (Obsidian's "center force"), so pages with
  // no links ring the cluster instead of drifting off and shrinking the view to a speck.
  local: { repel: 0.9, center: 0.3, gravity: 0.05, linkDistance: 42, fontSize: 9, labelFade: 1, warmup: 160, maxZoom: 1.8, neighbourLabels: true },
  full: { repel: 0.6, center: 0.2, gravity: 0.08, linkDistance: 32, fontSize: 9, labelFade: 1, warmup: 300, maxZoom: 1.6, neighbourLabels: false },
};

/** How many links touch each node id. */
export function degrees(links) {
  const d = new Map();
  for (const l of links) {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    d.set(s, (d.get(s) || 0) + 1);
    d.set(t, (d.get(t) || 0) + 1);
  }
  return d;
}

/** A node grows slowly with its links, as in Quartz: 2 + √links. */
export const nodeRadius = (degree) => 2 + Math.sqrt(degree || 0);

/**
 * Labels fade in as you zoom (Quartz: (k·scale − 1) / 3.75): hidden until about 1.5×, whole by
 * about 2.7×, so a resting graph shows shapes, not a fog of half-read names. `fade` > 1 starts sooner.
 */
export function labelAlpha(zoom, fade = 1) {
  return Math.min(1, Math.max(0, (zoom * fade - 1.5) / 1.2));
}

/** A label short enough not to crowd its neighbours; the whole title shows on hover. */
export function shortLabel(title, max = 26) {
  const t = String(title || "").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

/**
 * How visible a label is when nothing is hovered: the page you are on always, its direct
 * neighbours mostly (they answer "what is this connected to?"), everyone else as you zoom in.
 */
export function restingLabelAlpha({ isCurrent, isNeighbour, zoomAlpha }) {
  if (isCurrent) return 1;
  if (isNeighbour) return Math.max(zoomAlpha, 0.8);
  return zoomAlpha;
}

/** The zoom and offset that fit points into a w×h box with some padding, capped so few nodes don't blow up. */
export function fitTransform(points, w, h, { pad = 40, maxZoom = 2.4 } = {}) {
  if (!points.length) return { k: 1, x: w / 2, y: h / 2 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  const bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1);
  const k = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, maxZoom);
  return { k, x: w / 2 - k * (x0 + x1) / 2, y: h / 2 - k * (y0 + y1) / 2 };
}

/** One step of an ease toward a target, frame-rate tolerant. Returns [value, stillMoving]. */
export function ease(value, target, rate = 0.2) {
  const next = value + (target - value) * rate;
  return Math.abs(target - next) < 0.01 ? [target, false] : [next, true];
}

/** A CSS color the canvas normalized ("#rrggbb" or "rgba(r, g, b, a)") → { color: 0xRRGGBB, alpha }. */
export function toPixiColor(css) {
  const s = String(css || "").trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) return { color: parseInt(m[1], 16), alpha: 1 };
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map((v) => Math.round(Number(v)));
    return { color: (r << 16) | (g << 8) | b, alpha: m[4] === undefined ? 1 : Number(m[4]) };
  }
  return { color: 0x888888, alpha: 1 };
}
