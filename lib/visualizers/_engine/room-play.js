/**
 * Marbles in a room float a little (only those on screen, and not while a peek is open) and can
 * be dragged around with a mouse, just for fun (touch and pen scroll the page as usual). A drag
 * never opens the marble; a plain click still does. An interrupted drag (pointercancel, a lost
 * release) simply ends. Where a marble is dropped lasts until the page is left. Browser only.
 */
export function startRoomPlay(root = document) {
  const marbles = [...root.querySelectorAll(".room-object--marble")];
  const onScreen = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle("is-floating", e.isIntersecting);
  });
  marbles.forEach((m, i) => {
    onScreen.observe(m);
    m.style.setProperty("--float-delay", `${-((i * 1.37) % 6).toFixed(2)}s`);
    m.setAttribute("draggable", "false");
    m.querySelector("img")?.setAttribute("draggable", "false");
  });

  // The glare on each marble sits where the light at the screen's top right corner reflects
  // toward you (the halfway direction between the light and your eye), from where it is now.
  const glare = (m) => {
    const r = m.getBoundingClientRect();
    if (!r.width) return;
    const lx = innerWidth - (r.left + r.width / 2), ly = -(r.top + r.height / 3), lz = Math.max(innerWidth, innerHeight) * 0.9;
    const n = Math.hypot(lx, ly, lz) || 1;
    const hx = lx / n, hy = ly / n, hz = lz / n + 1, hn = Math.hypot(hx, hy, hz);
    m.style.setProperty("--sx", `${(50 + 46 * (hx / hn)).toFixed(1)}%`);
    m.style.setProperty("--sy", `${(50 + 46 * (hy / hn)).toFixed(1)}%`);
  };
  marbles.forEach(glare);
  let glareQueued = false;
  const glareAll = () => {
    if (glareQueued) return;
    glareQueued = true;
    requestAnimationFrame(() => { glareQueued = false; marbles.forEach((m) => { if (m.classList.contains("is-floating")) glare(m); }); });
  };
  addEventListener("scroll", glareAll, { passive: true });
  addEventListener("resize", glareAll);

  let drag = null;
  let swallowClick = false;

  root.addEventListener("pointerdown", (e) => {
    const m = e.target.closest?.(".room-object--marble");
    if (!m || e.button !== 0 || e.pointerType !== "mouse") return;
    drag = { m, x: e.clientX, y: e.clientY, dx: +(m.dataset.dx || 0), dy: +(m.dataset.dy || 0), moved: false };
  });

  const end = () => {
    if (drag?.moved) drag.m.classList.remove("is-dragging");
    drag = null;
  };
  addEventListener("pointercancel", end);
  addEventListener("blur", end);

  addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (e.buttons === 0) return end(); // the release was lost (another window, a cancelled drag)
    const mx = e.clientX - drag.x, my = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(mx, my) < 6) return;
    drag.moved = true;
    drag.m.classList.add("is-dragging");
    drag.m.style.transform = `translate(${drag.dx + mx}px, ${drag.dy + my}px)`;
    glare(drag.m);
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
