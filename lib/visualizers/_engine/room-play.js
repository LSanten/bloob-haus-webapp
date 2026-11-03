/**
 * Marbles in a room float a little and can be dragged around, just for fun (with a mouse or pen;
 * on touch the page scrolls as usual). A drag never opens the marble; a plain click still does.
 * Where a marble is dropped lasts until the page is left. Browser only.
 */
export function startRoomPlay(root = document) {
  const marbles = [...root.querySelectorAll(".room-object--marble")];
  marbles.forEach((m, i) => {
    m.style.setProperty("--float-delay", `${-((i * 1.37) % 6).toFixed(2)}s`);
    m.setAttribute("draggable", "false");
    m.querySelector("img")?.setAttribute("draggable", "false");
  });

  let drag = null;
  let swallowClick = false;

  root.addEventListener("pointerdown", (e) => {
    const m = e.target.closest?.(".room-object--marble");
    if (!m || e.button !== 0 || e.pointerType === "touch") return;
    drag = { m, x: e.clientX, y: e.clientY, dx: +(m.dataset.dx || 0), dy: +(m.dataset.dy || 0), moved: false };
  });

  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const mx = e.clientX - drag.x, my = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(mx, my) < 6) return;
    drag.moved = true;
    drag.m.classList.add("is-dragging");
    drag.m.style.transform = `translate(${drag.dx + mx}px, ${drag.dy + my}px)`;
  });

  addEventListener("pointerup", (e) => {
    if (!drag) return;
    if (drag.moved) {
      drag.m.dataset.dx = String(drag.dx + e.clientX - drag.x);
      drag.m.dataset.dy = String(drag.dy + e.clientY - drag.y);
      drag.m.classList.remove("is-dragging");
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
    }
    drag = null;
  });

  // The click that ends a drag is not a click on the marble.
  addEventListener("click", (e) => {
    if (!swallowClick) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    swallowClick = false;
  }, true);
}
