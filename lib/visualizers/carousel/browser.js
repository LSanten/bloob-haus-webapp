/**
 * Carousel — behaviour only. Never builds slide markup (renderer.js does).
 *
 * On every [data-carousel]:
 *   - marks the slide nearest the track's centre as .is-active, its neighbours as
 *     .is-before / .is-after, the rest .is-far (CSS draws the sizes and fades);
 *   - reveals the prev/next buttons and the "2 / 6" counter;
 *   - ArrowLeft / ArrowRight on the focused track move one photo;
 *   - clicking a side photo brings it to the centre instead of opening the lightbox;
 *   - [data-loop]: the renderer put copies of the last photos before the first and of the
 *     first photos after the last. When a move settles on a copy, the track jumps (no
 *     animation) to the real photo it copies, so you can keep going either way forever.
 * Native scroll-snap does the swiping, so touch and trackpads need nothing extra.
 */

const reduceMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initCarousel(root) {
  const track = root.querySelector(".carousel__track");
  const slides = Array.from(root.querySelectorAll(".carousel__slide"));
  if (!track || !slides.length) return;

  const loop = root.hasAttribute("data-loop");
  const isClone = (s) => s.hasAttribute("data-clone");
  const realCount = slides.filter((s) => !isClone(s)).length;
  const controls = root.querySelector(".carousel__controls");
  const prev = root.querySelector(".carousel__btn--prev");
  const next = root.querySelector(".carousel__btn--next");
  const count = root.querySelector(".carousel__count");
  let active = -1;

  const centreOf = (s) => Math.round(s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2);

  function nearest() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function mark(i) {
    if (i === active) return;
    active = i;
    slides.forEach((s, j) => {
      s.classList.toggle("is-active", j === i);
      s.classList.toggle("is-before", j === i - 1);
      s.classList.toggle("is-after", j === i + 1);
      s.classList.toggle("is-far", Math.abs(j - i) > 1);
    });
    const shown = Number(slides[i].dataset.index ?? i) + 1;
    if (count) count.textContent = `${shown} / ${realCount}`;
    if (prev) prev.disabled = !loop && i === 0;
    if (next) next.disabled = !loop && i === slides.length - 1;
  }

  // Programmatic moves (buttons, keys, clicking a side photo) switch scroll-snap off while the
  // smooth scroll runs: with mandatory snap on, Chrome re-snaps mid-animation, so the photo
  // stops just short of centre and then twitches into place. Snap comes back on at the end,
  // where the target is already exactly centred. Swiping and trackpads still use native snap.
  let restoreTimer = null;
  function restoreSnap() {
    clearTimeout(restoreTimer);
    track.style.scrollSnapType = "";
  }

  function goTo(i) {
    const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
    const smooth = !reduceMotion();
    if (smooth) {
      track.style.scrollSnapType = "none";
      clearTimeout(restoreTimer);
      track.addEventListener("scrollend", restoreSnap, { once: true });
      restoreTimer = setTimeout(restoreSnap, 1000); // browsers without scrollend
    }
    track.scrollTo({ left: centreOf(s), behavior: smooth ? "smooth" : "auto" });
  }

  // Loop: settled on a copy → jump to the real photo. Both look identical, and transitions are
  // off for that one frame, so the swap is invisible.
  function jumpTo(i) {
    root.classList.add("is-jumping");
    track.style.scrollSnapType = "none";
    track.scrollLeft = centreOf(slides[i]);
    mark(i);
    void track.offsetWidth; // apply the new classes without transitions
    requestAnimationFrame(() => {
      track.style.scrollSnapType = "";
      root.classList.remove("is-jumping");
    });
  }

  function settle() {
    if (!loop) return;
    const i = nearest();
    if (!isClone(slides[i])) return;
    const idx = slides[i].dataset.index;
    const real = slides.findIndex((s) => !isClone(s) && s.dataset.index === idx);
    if (real > -1) jumpTo(real);
  }

  let ticking = false;
  let settleTimer = null;
  const onScroll = () => {
    if (loop) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 160); // browsers without scrollend
    }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; mark(nearest()); });
  };
  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("scrollend", () => { clearTimeout(settleTimer); settle(); });
  window.addEventListener("resize", onScroll);

  if (prev) prev.addEventListener("click", () => goTo(active - 1));
  if (next) next.addEventListener("click", () => goTo(active + 1));

  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
  });

  // Capture phase: a click on a side photo centres it and never reaches the lightbox.
  track.addEventListener("click", (e) => {
    const slide = e.target.closest(".carousel__slide");
    if (!slide) return;
    const i = slides.indexOf(slide);
    if (i !== active) {
      e.preventDefault();
      e.stopPropagation();
      goTo(i);
    }
  }, true);

  if (controls) controls.hidden = realCount < 2;
  root.classList.add("is-ready");
  if (loop) {
    // Start on the first real photo, with the last one already peeking in on the left.
    jumpTo(slides.findIndex((s) => !isClone(s)));
  } else {
    mark(nearest());
  }
}

function initAll() {
  document.querySelectorAll("[data-carousel]").forEach(initCarousel);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}
