/**
 * Scene Nav Builder — pointer drag engine.
 * Pure DOM module: no panel knowledge. Positions are % of the container box.
 * Drag moves an element; Shift+drag (vertical) scales it.
 */
export function makeDraggable(el, container, onChange) {
  let start = null;

  function onDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const box = container.getBoundingClientRect();
    start = {
      px: e.clientX,
      py: e.clientY,
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      scale: parseFloat(el.style.width) || 10,
      box,
      scaling: e.shiftKey,
    };
    el.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!start) return;
    const dx = ((e.clientX - start.px) / start.box.width) * 100;
    const dy = ((e.clientY - start.py) / start.box.height) * 100;
    if (start.scaling) {
      const next = Math.max(1, start.scale - dy * 0.5);
      el.style.width = `${next}%`;
    } else {
      el.style.left = `${start.x + dx}%`;
      el.style.top = `${start.y + dy}%`;
    }
  }

  function onUp() {
    if (!start) return;
    const result = {
      x: Math.round(parseFloat(el.style.left) * 10) / 10,
      y: Math.round(parseFloat(el.style.top) * 10) / 10,
      scale: Math.round(parseFloat(el.style.width) * 10) / 10,
    };
    start = null;
    onChange(result);
  }

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
  };
}
