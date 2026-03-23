/**
 * Testimonials — runtime Swiper initialization
 *
 * This visualizer owns its own Swiper setup. It runs after the page loads,
 * destroys any Swiper instance that theme.min.js already created on
 * #testimonials, and re-initializes with the full config — including
 * autoplay when `data-slide-time` is set on the container.
 *
 * Why own it here instead of relying on theme.min.js:
 * - theme.min.js initializes Swiper without autoplay config
 * - Once initialized without autoplay, enabling it after the fact is fragile
 * - A visualizer should be self-contained — it owns its DOM behavior
 *
 * `data-slide-time` (ms) is set by the renderer when `time=Xs` is in the
 * ::: testimonials container settings.
 */
window.addEventListener("load", () => {
  const container = document.querySelector(".testimonials__container");
  if (!container) return;

  // Destroy any existing Swiper instance (created by theme.min.js)
  if (container.swiper) {
    container.swiper.destroy(true, true);
  }

  const slideMs = parseInt(container.dataset.slideTime, 10) || null;

  const config = {
    grabCursor: true,
    speed: 1000,
    loop: container.querySelectorAll(".swiper-slide").length > 1,
    navigation: {
      nextEl: ".testimonials__next-button",
      prevEl: ".testimonials__prev-button",
    },
    ...(slideMs && {
      autoplay: {
        delay: slideMs,
        disableOnInteraction: false,
      },
    }),
  };

  new Swiper(".testimonials__container", config);
});
