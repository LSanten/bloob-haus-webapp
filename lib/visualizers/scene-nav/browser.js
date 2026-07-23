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

// Pure: computes the mouseenter filter+transform from the element's hover flags.
// hoverGlow off → no glow filter; hoverScale off → no scale(1.06). resetRot drops
// the base rotation on hover (scale-only), matching the reset-rotation-on-hover setting.
export function hoverStyles({ hoverGlow, hoverScale, glowFilter, baseTransform, resetRot }) {
  const filter = hoverGlow ? glowFilter : "";
  const rot = resetRot ? "" : baseTransform;
  const transform = [rot, hoverScale ? "scale(1.06)" : ""].filter(Boolean).join(" ");
  return { filter, transform };
}

function initElement(el) {
  const color      = el.dataset.glow                || "#FFD700";
  const intensity  = el.dataset.glowIntensity       || "1";
  const action     = el.dataset.action              || "filter";
  const value      = el.dataset.value               || "";
  const rotation   = parseFloat(el.dataset.rotation) || 0;
  const resetRot   = el.dataset.resetRotationOnHover !== "false";
  const hoverGlow  = el.dataset.hoverGlow  !== "false";
  const hoverScale = el.dataset.hoverScale !== "false";
  const glowFilter = buildGlowFilter(color, intensity);

  // Base transform — renderer already sets this inline, but set it here
  // too so JS hover can reliably restore it after mouseleave.
  const baseTransform = rotation ? `rotate(${rotation}deg)` : "";

  // While the builder is editing this scene it owns transforms (drag/resize/rotate).
  // Skip the hover effect then, or mouseleave would reset transform to the element's
  // ORIGINAL rotation and clobber whatever the builder just applied (B1).
  const editing = () => el.closest(".scene-nav-container.snb-active, .scene-nav-wrapper.snb-active");
  el.addEventListener("mouseenter", () => {
    if (editing()) return;
    const s = hoverStyles({ hoverGlow, hoverScale, glowFilter, baseTransform, resetRot });
    el.style.filter    = s.filter;
    el.style.transform = s.transform;
  });
  el.addEventListener("mouseleave", () => {
    if (editing()) return;
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

// Runtime wiring — guarded so the module is importable in Node (tests) without a DOM.
if (typeof document !== "undefined") {
  // Init all elements on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".scene-nav-el").forEach(initElement);
  });

  // Debug mode: lazy-load the builder overlay. Ships as a separate bundle; normal
  // visitors never fetch it.
  document.querySelectorAll('[data-scene-debug="true"]').forEach((container) => {
    import("/assets/js/visualizers/scene-nav-builder.js")
      .then((m) => m.default(container))
      .catch((e) => console.warn("[scene-nav] builder failed to load:", e));
  });
}
