/**
 * Scene Nav Builder — on-canvas transform handles + marquee (DOM).
 *
 * Grips replace hidden modifier keys: a selected element (or a multi-selection's
 * bounding box) gets a resize grip and a rotate grip you drag. The marquee is a
 * rubber-band rectangle drawn on empty canvas that reports a %-rect on release.
 * Pure geometry lives in selection.js; this file only wires pointers to callbacks.
 */

function el(cls, title) {
  const d = document.createElement("div");
  d.className = cls;
  if (title) d.title = title;
  return d;
}

// Pointer capture on a grip; reports drag deltas as % of the container box.
function dragGrip(grip, container, onMove, onEnd) {
  let start = null;
  function down(e) {
    e.preventDefault();
    e.stopPropagation();
    start = { px: e.clientX, py: e.clientY, box: container.getBoundingClientRect() };
    grip.setPointerCapture?.(e.pointerId);
    onMove.start && onMove.start();
  }
  function move(e) {
    if (!start) return;
    onMove({
      dxPct: ((e.clientX - start.px) / start.box.width) * 100,
      dyPct: ((e.clientY - start.py) / start.box.height) * 100,
      clientX: e.clientX, clientY: e.clientY, box: start.box,
    });
  }
  function up() { if (!start) return; start = null; onEnd && onEnd(); }
  grip.addEventListener("pointerdown", down);
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", up);
  grip.addEventListener("pointercancel", up);
  return () => {
    grip.removeEventListener("pointerdown", down);
    grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", up);
    grip.removeEventListener("pointercancel", up);
  };
}

/**
 * Mount resize + rotate grips as children of a single element node.
 * @param opts.getScale/setScale — element scale (% width)
 * @param opts.setRotation — element rotation (deg)
 * @param opts.getCenterPx — () => {x,y} element center in screen px
 * @param opts.onEnd — called on pointer release (commit/refresh)
 */
export function mountElementHandles(node, container, opts) {
  const resize = el("snb-grip snb-grip-resize", "drag to resize");
  const rotate = el("snb-grip snb-grip-rotate", "drag to rotate");
  node.append(resize, rotate);
  let startScale = 0;

  const cleanResize = dragGrip(resize, container, Object.assign(
    ({ dxPct, dyPct }) => opts.setScale(Math.max(2, startScale + (dxPct + dyPct) / 2)),
    { start: () => { startScale = opts.getScale(); } },
  ), opts.onEnd);

  const cleanRotate = dragGrip(rotate, container,
    ({ clientX, clientY }) => {
      const c = opts.getCenterPx();
      const deg = (Math.atan2(clientY - c.y, clientX - c.x) * 180) / Math.PI + 90;
      opts.setRotation(Math.round(((deg % 360) + 360) % 360 > 180 ? (deg % 360) - 360 : deg % 360));
    }, opts.onEnd);

  return () => { cleanResize(); cleanRotate(); resize.remove(); rotate.remove(); };
}

/**
 * Mount resize (factor) + rotate (deg) grips on a group bounding-box overlay.
 * @param opts.onScale(factor) — proportional scale about group center (>0)
 * @param opts.onRotate(deg)   — rotation delta about group center
 * @param opts.getBoxPx — () => {cx,cy,halfDiag} of the group box in screen px
 */
export function mountGroupHandles(overlay, container, opts) {
  const resize = el("snb-grip snb-grip-resize", "drag to resize group");
  const rotate = el("snb-grip snb-grip-rotate", "drag to rotate group");
  overlay.append(resize, rotate);
  let startDiag = 1, startAngle = 0;

  const cleanResize = dragGrip(resize, container, Object.assign(
    ({ clientX, clientY }) => {
      const b = opts.getBoxPx();
      const d = Math.hypot(clientX - b.cx, clientY - b.cy) || 1;
      opts.onScale(d / startDiag);
    },
    { start: () => { const b = opts.getBoxPx(); startDiag = b.halfDiag || 1; } },
  ), opts.onEnd);

  const cleanRotate = dragGrip(rotate, container, Object.assign(
    ({ clientX, clientY }) => {
      const b = opts.getBoxPx();
      const a = Math.atan2(clientY - b.cy, clientX - b.cx);
      const deg = ((a - startAngle) * 180) / Math.PI;
      opts.onRotate(deg);
      startAngle = a;
    },
    { start: () => { const b = opts.getBoxPx(); startAngle = Math.atan2(0, 1); void b; } },
  ), opts.onEnd);

  return () => { cleanResize(); cleanRotate(); resize.remove(); rotate.remove(); };
}

/**
 * Rubber-band selection. Pointerdown on empty container area draws a rectangle;
 * on release, reports the selection rect in % of the container box.
 * @param onSelect({x,y,w,h}) — %-rect (only fired when the drag has area)
 * @param isEmptyTarget(e) — return true if the event started on empty canvas
 */
export function mountMarquee(container, { onSelect, isEmptyTarget }) {
  let start = null;
  let rectEl = null;

  function down(e) {
    if (e.button !== 0 || !isEmptyTarget(e)) return;
    const box = container.getBoundingClientRect();
    start = { px: e.clientX, py: e.clientY, box };
    rectEl = el("snb-marquee");
    container.append(rectEl);
    container.setPointerCapture?.(e.pointerId);
  }
  function move(e) {
    if (!start) return;
    const x = Math.min(e.clientX, start.px) - start.box.left;
    const y = Math.min(e.clientY, start.py) - start.box.top;
    const w = Math.abs(e.clientX - start.px);
    const h = Math.abs(e.clientY - start.py);
    Object.assign(rectEl.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  }
  function up(e) {
    if (!start) return;
    const box = start.box;
    const rx = (Math.min(e.clientX, start.px) - box.left) / box.width * 100;
    const ry = (Math.min(e.clientY, start.py) - box.top) / box.height * 100;
    const rw = Math.abs(e.clientX - start.px) / box.width * 100;
    const rh = Math.abs(e.clientY - start.py) / box.height * 100;
    rectEl.remove(); rectEl = null; start = null;
    if (rw > 1 && rh > 1) onSelect({ x: rx, y: ry, w: rw, h: rh });
  }
  container.addEventListener("pointerdown", down);
  container.addEventListener("pointermove", move);
  container.addEventListener("pointerup", up);
  container.addEventListener("pointercancel", up);
  return () => {
    container.removeEventListener("pointerdown", down);
    container.removeEventListener("pointermove", move);
    container.removeEventListener("pointerup", up);
    container.removeEventListener("pointercancel", up);
    if (rectEl) rectEl.remove();
  };
}
