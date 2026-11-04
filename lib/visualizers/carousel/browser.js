/**
 * Carousel — behaviour only. Never builds slide markup (renderer.js does).
 *
 * On every [data-carousel]:
 *   - marks the slide nearest the track's centre as .is-active, its neighbours as
 *     .is-before / .is-after, the rest .is-far (CSS draws the sizes and fades);
 *   - reveals the prev/next buttons and the "2 / 6" counter;
 *   - ArrowLeft / ArrowRight on the focused track move one photo;
 *   - clicking a side photo brings it to the centre instead of opening the lightbox.
 * Native scroll-snap does the swiping, so touch and trackpads need nothing extra.
 */

const reduceMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initCarousel(root) {
  const track = root.querySelector(".carousel__track");
  const slides = Array.from(root.querySelectorAll(".carousel__slide"));
  if (!track || !slides.length) return;

  const controls = root.querySelector(".carousel__controls");
  const prev = root.querySelector(".carousel__btn--prev");
  const next = root.querySelector(".carousel__btn--next");
  const count = root.querySelector(".carousel__count");
  let active = -1;

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
    if (count) count.textContent = `${i + 1} / ${slides.length}`;
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === slides.length - 1;
  }

  function goTo(i) {
    const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
    track.scrollTo({
      left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2,
      behavior: reduceMotion() ? "auto" : "smooth",
    });
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; mark(nearest()); });
  };
  track.addEventListener("scroll", onScroll, { passive: true });
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

  if (controls) controls.hidden = slides.length < 2;
  root.classList.add("is-ready");
  mark(nearest());
}

function initAll() {
  document.querySelectorAll("[data-carousel]").forEach(initCarousel);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}
