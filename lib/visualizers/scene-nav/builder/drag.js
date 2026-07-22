/**
 * Scene Nav Builder — pointer drag engine.
 * Pure DOM module: no panel/selection knowledge. Reports the drag delta as a
 * percentage of the container box (so the panel can move a whole selection).
 * Scaling/rotation are handled by on-canvas handles (handles.js), not here.
 */
export function makeDraggable(node, container, { onStart, onDrag, onEnd } = {}) {
  let start = null;

  function onDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const box = container.getBoundingClientRect();
    start = { px: e.clientX, py: e.clientY, box };
    node.setPointerCapture?.(e.pointerId);
    onStart && onStart(e);
  }

  function onMove(e) {
    if (!start) return;
    const dx = ((e.clientX - start.px) / start.box.width) * 100;
    const dy = ((e.clientY - start.py) / start.box.height) * 100;
    onDrag && onDrag({ dx, dy });
  }

  function onUp() {
    if (!start) return;
    start = null;
    onEnd && onEnd();
  }

  node.addEventListener("pointerdown", onDown);
  node.addEventListener("pointermove", onMove);
  node.addEventListener("pointerup", onUp);
  node.addEventListener("pointercancel", onUp);
  return () => {
    node.removeEventListener("pointerdown", onDown);
    node.removeEventListener("pointermove", onMove);
    node.removeEventListener("pointerup", onUp);
    node.removeEventListener("pointercancel", onUp);
  };
}
