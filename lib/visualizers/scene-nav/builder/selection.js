/**
 * Scene Nav Builder — pure interaction logic (no DOM).
 *
 * Selection sets, marquee hit-testing, range/toggle selection, group-transform math,
 * and mobile-layout state. Kept DOM-free so it is unit-testable in Node; the panel /
 * handles / marquee DOM code consumes these.
 *
 * All coordinates are percentages of the artboard box, matching the grammar
 * (`at: x, y` = top-left %, `scale` = width %). An element's square footprint is
 * [x, x+scale] × [y, y+scale]; its center is (x + scale/2, y + scale/2).
 */

function center(el) {
  return { cx: el.x + el.scale / 2, cy: el.y + el.scale / 2 };
}

/** Indices of elements whose center falls inside rect {x,y,w,h} (percent). */
export function elementsInRect(elements, rect) {
  const x2 = rect.x + rect.w;
  const y2 = rect.y + rect.h;
  const out = [];
  elements.forEach((el, i) => {
    const { cx, cy } = center(el);
    if (cx >= rect.x && cx <= x2 && cy >= rect.y && cy <= y2) out.push(i);
  });
  return out;
}

/** Inclusive index range between anchor and target (order-independent). */
export function rangeSelect(count, anchor, target) {
  const lo = Math.max(0, Math.min(anchor, target));
  const hi = Math.min(count - 1, Math.max(anchor, target));
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/** Return a new Set with index i toggled. */
export function toggle(set, i) {
  const next = new Set(set);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

/**
 * Whether the scene's mobile layout diverges from desktop.
 * Diverged if a mobile aspectRatio differs from desktop, or any element/background
 * carries a non-empty mobileOverride. `overrides` counts such items.
 */
export function mobileState(scene) {
  if (!scene || !scene.mobile) return { diverged: false, overrides: 0 };
  const items = [...(scene.elements || []), ...(scene.backgrounds || [])];
  const overrides = items.filter(
    (it) => it.mobileOverride && Object.keys(it.mobileOverride).length > 0
  ).length;
  const arDiverged =
    !!scene.mobile.aspectRatio && scene.mobile.aspectRatio !== scene.aspectRatio;
  return { diverged: arDiverged || overrides > 0, overrides };
}

// ── group transform ─────────────────────────────────────────────────────────────

/** Union bounding box of the selected elements' square footprints, with its center. */
export function groupBBox(elements, indices) {
  const sel = indices.map((i) => elements[i]);
  const minX = Math.min(...sel.map((e) => e.x));
  const minY = Math.min(...sel.map((e) => e.y));
  const maxX = Math.max(...sel.map((e) => e.x + e.scale));
  const maxY = Math.max(...sel.map((e) => e.y + e.scale));
  return {
    x: minX, y: minY, w: maxX - minX, h: maxY - minY,
    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
  };
}

/**
 * Scale the whole selection proportionally about the group center.
 * Each element's scale *= factor and its center moves toward/away from the pivot by
 * the same factor. Returns [{ i, x, y, scale }] (does not mutate).
 */
export function scaleGroup(elements, indices, factor) {
  const { cx, cy } = groupBBox(elements, indices);
  return indices.map((i) => {
    const el = elements[i];
    const c = center(el);
    const nScale = el.scale * factor;
    const ncx = cx + (c.cx - cx) * factor;
    const ncy = cy + (c.cy - cy) * factor;
    return { i, scale: nScale, x: ncx - nScale / 2, y: ncy - nScale / 2 };
  });
}

/** Move every selected element by (dx, dy). Returns [{ i, x, y }]. */
export function moveGroup(elements, indices, dx, dy) {
  return indices.map((i) => ({ i, x: elements[i].x + dx, y: elements[i].y + dy }));
}

/**
 * Rotate each selected element's CENTER about the group center by `deg`.
 * Returns [{ i, x, y }] (new top-left). The caller adds `deg` to each element's own
 * `rotation`. Positive deg = clockwise in screen space (y grows downward).
 */
export function rotateGroupPositions(elements, indices, deg) {
  const { cx, cy } = groupBBox(elements, indices);
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return indices.map((i) => {
    const el = elements[i];
    const c = center(el);
    const dx = c.cx - cx;
    const dy = c.cy - cy;
    const ncx = cx + dx * cos - dy * sin;
    const ncy = cy + dx * sin + dy * cos;
    return { i, x: ncx - el.scale / 2, y: ncy - el.scale / 2 };
  });
}
