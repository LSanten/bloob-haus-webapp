/**
 * Scene Nav Visualizer — Renderer
 *
 * Pure function: scene data object → HTML string.
 * No DOM manipulation, no side effects.
 *
 * The output HTML uses .scene-nav-el data attributes so browser.js can
 * attach hover glow, rotation, and click action behaviour at runtime.
 *
 * Image src values are used as-is (relative paths or absolute URLs).
 * The path prefix (e.g. ../media/studio-bloob/) comes through from the
 * code fence and is already baked into the image value by the parser.
 *
 * @param {{ aspectRatio: string|null, backgrounds: Array, elements: Array }} sceneData
 * @param {{ maxWidth?: string }} [settings]
 * @returns {string} HTML string
 */

function escAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escText(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function render(sceneData, settings = {}) {
  const { aspectRatio, backgrounds, elements } = sceneData;
  const maxWidth = settings.maxWidth || "900px";

  const containerStyle = [
    `max-width:${maxWidth}`,
    aspectRatio ? `aspect-ratio:${aspectRatio}` : "",
    aspectRatio ? "overflow:hidden" : "",
  ].filter(Boolean).join(";");

  const bgHtml = (backgrounds || []).map(bg => {
    const layerStyle = [
      `left:${bg.x}%`,
      `top:${bg.y}%`,
      `width:${bg.scale}%`,
    ].join(";");
    return `<div class="scene-nav-bg-layer" style="${layerStyle}"><img src="${escAttr(bg.image)}" alt="" draggable="false" /></div>`;
  }).join("\n");

  const elsHtml = elements.map((el) => {
    const labelHtml = el.label
      ? `<span class="scene-nav-label">${escText(el.label)}</span>`
      : "";

    return `<div class="scene-nav-el"
  data-glow="${escAttr(el.glow)}"
  data-glow-intensity="${escAttr(String(el.glowIntensity))}"
  data-action="${escAttr(el.action)}"
  data-value="${escAttr(el.value || "")}"
  data-rotation="${escAttr(String(el.rotation))}"
  data-reset-rotation-on-hover="${escAttr(String(el.resetRotationOnHover))}"
  style="left:${el.x}%;top:${el.y}%;width:${el.scale}%;transform:rotate(${el.rotation}deg);">
  <img src="${escAttr(el.image)}" alt="${escAttr(el.label || "")}" draggable="false" />
  ${labelHtml}
</div>`;
  }).join("\n");

  return `<div class="scene-nav-container" style="${containerStyle}">
${bgHtml}
${elsHtml}
</div>`;
}
