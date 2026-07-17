/**
 * browser.js — the garden shape's runtime.
 *
 * 1. Proportional scaling: the garden's logical canvas (e.g. 1000×600) scales
 *    to fit its container, aspect preserved, capped at natural size (decision
 *    15 — the builder-only --ui-zoom does not ship).
 * 2. Navigation: element click → its page panel; Back → the garden.
 * 3. Sets document.title from the fence's title (identity lives in the block,
 *    not frontmatter — divergence #1).
 *
 * Bundled to an IIFE by the site build (bundle-visualizers.js).
 */

function init() {
  const root = document.querySelector(".garden-shape");
  if (!root) return;

  const title = root.getAttribute("data-garden-title");
  if (title) document.title = title;

  const view = root.querySelector(".garden-view");
  const scaleBox = root.querySelector(".garden-scale");
  const scene = root.querySelector(".garden-scene");
  const pages = root.querySelector(".garden-pages");
  const W = parseInt(root.getAttribute("data-canvas-w"), 10) || 1000;
  const H = parseInt(root.getAttribute("data-canvas-h"), 10) || 600;

  function rescale() {
    if (view.hidden) return;
    const avail = view.clientWidth;
    if (!avail) return;
    const scale = Math.min(avail / W, 1); // scale down to fit, never up
    scene.style.transform = `scale(${scale})`;
    scaleBox.style.width = `${W * scale}px`;
    scaleBox.style.height = `${H * scale}px`;
  }

  if (window.ResizeObserver) new ResizeObserver(rescale).observe(view);
  window.addEventListener("resize", rescale);
  rescale();

  root.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-garden-page]");
    if (opener) {
      const panel = root.querySelector(
        `#garden-page-${CSS.escape(opener.getAttribute("data-garden-page"))}`
      );
      if (!panel) return;
      view.hidden = true;
      pages.hidden = false;
      pages.querySelectorAll(".garden-page").forEach((p) => (p.hidden = true));
      panel.hidden = false;
      window.scrollTo(0, 0);
      return;
    }
    if (e.target.closest(".garden-back-btn")) {
      pages.hidden = true;
      view.hidden = false;
      rescale();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
