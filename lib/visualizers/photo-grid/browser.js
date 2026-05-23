/**
 * Photo Grid — client-side video behaviour
 *
 * For each video item in a photo-grid:
 *  1. Attempt autoplay. If blocked (iOS Low Power Mode), add `is-paused` class
 *     which reveals the ▶ play overlay so the user knows they can tap to play.
 *  2. Overlay tap → play video, hide overlay. Subsequent taps open PhotoSwipe.
 *  3. If any video is paused on page load, inject a "Play all animations" button
 *     before the first grid that has paused videos.
 *
 * PhotoSwipe video slide support is handled in photoswipe-scripts.njk.
 */

function initVideoItems() {
  const items = document.querySelectorAll(".photo-grid__item--video");
  if (!items.length) return;

  const pausedItems = [];

  items.forEach((item) => {
    const video = item.querySelector("video");
    const overlay = item.querySelector(".photo-grid__play-overlay");
    if (!video || !overlay) return;

    video.play().catch((err) => {
      if (err.name === "NotAllowedError") {
        item.classList.add("is-paused");
        pausedItems.push(item);
      }
    });

    overlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      video.play().then(() => item.classList.remove("is-paused")).catch(() => {});
    });
  });

  // After a short delay, inject "Play all" button if any videos are still paused
  setTimeout(() => {
    const stillPaused = [...items].filter((i) => i.classList.contains("is-paused"));
    if (!stillPaused.length) return;

    const firstGrid = stillPaused[0].closest(".photo-grid, .photo-grid--rows");
    if (!firstGrid) return;

    const btn = document.createElement("button");
    btn.className = "photo-grid-play-all";
    btn.textContent = "▶ Play all animations";
    btn.style.display = "block";
    firstGrid.parentNode.insertBefore(btn, firstGrid);

    btn.addEventListener("click", () => {
      document.querySelectorAll(".photo-grid__item--video.is-paused").forEach((item) => {
        const video = item.querySelector("video");
        if (video) {
          video.play().then(() => item.classList.remove("is-paused")).catch(() => {});
        }
      });
      btn.style.display = "none";
    });
  }, 300);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVideoItems);
} else {
  initVideoItems();
}
