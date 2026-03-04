/**
 * Scene Nav Visualizer — Runtime (browser.js)
 *
 * Attaches hover glow effects, rotation, and click actions to .scene-nav-el elements
 * rendered by the build-time transform (renderer.js).
 *
 * Reads per-element configuration from data attributes:
 *   data-glow                    — hex glow colour
 *   data-glow-intensity          — float multiplier (default: 1)
 *   data-action                  — 'filter' | 'link' | 'anchor'
 *   data-value                   — tag name / URL / element ID
 *   data-rotation                — degrees (default: 0)
 *   data-reset-rotation-on-hover — "true" | "false" (default: true)
 *                                  true  → hover snaps to 0° (scale only)
 *                                  false → hover preserves rotation
 *
 * The glow effect uses CSS filter: drop-shadow() stacked three times.
 * This traces the alpha channel of transparent PNGs — no canvas needed.
 */

function buildGlowFilter(color, intensity) {
  const gI = parseFloat(intensity) || 1;
  const g1 = Math.round(8  * gI);
  const g2 = Math.round(20 * gI);
  const g3 = Math.round(40 * gI);
  return [
    `drop-shadow(0 0 ${g1}px ${color})`,
    `drop-shadow(0 0 ${g2}px ${color})`,
    `drop-shadow(0 0 ${g3}px ${color}80)`,
  ].join(" ");
}

function initElement(el) {
  const color      = el.dataset.glow                || "#FFD700";
  const intensity  = el.dataset.glowIntensity       || "1";
  const action     = el.dataset.action              || "filter";
  const value      = el.dataset.value               || "";
  const rotation   = parseFloat(el.dataset.rotation) || 0;
  const resetRot   = el.dataset.resetRotationOnHover !== "false";
  const glowFilter = buildGlowFilter(color, intensity);

  // Base transform — renderer already sets this inline, but set it here
  // too so JS hover can reliably restore it after mouseleave.
  const baseTransform = rotation ? `rotate(${rotation}deg)` : "";

  el.addEventListener("mouseenter", () => {
    el.style.filter    = glowFilter;
    el.style.transform = (resetRot || !baseTransform ? "" : baseTransform + " ") + "scale(1.06)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.filter    = "";
    el.style.transform = baseTransform;
  });

  el.addEventListener("click", () => {
    if (action === "link" && value) {
      window.open(value, "_blank"); return;
    }
    if (action === "anchor" && value) {
      const target = document.getElementById(value)
                  || document.querySelector(`[name="${CSS.escape(value)}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth" }); return;
    }
    if (action === "filter" && value) {
      window.dispatchEvent(new CustomEvent("bloob:filter", { detail: { tag: value } }));
      // Shopify collection URL fallback
      const path = window.location.pathname;
      if (path.includes("/collections/")) {
        window.location.href = path.split("?")[0] + "?filter.p.tag=" + encodeURIComponent(value);
      }
    }
  });
}

// Init all elements on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".scene-nav-el").forEach(initElement);
});
