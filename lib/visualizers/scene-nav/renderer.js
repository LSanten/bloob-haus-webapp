/**
 * Scene Nav Visualizer — Renderer
 *
 * Pure function: scene data object → HTML string.
 * No DOM manipulation, no side effects.
 *
 * When sceneData.mobile is set, renders two containers:
 *   .scene-nav--desktop  (hidden below breakpoint via inline <style>)
 *   .scene-nav--mobile   (hidden above breakpoint via inline <style>)
 * wrapped in a unique-ID div so per-scene breakpoints don't conflict on multi-scene pages.
 *
 * Element rendering switches on el.type — currently only "image" is implemented.
 * onlyShowOn filtering: elements with onlyShowOn:["desktop"] are excluded from the mobile
 * container and vice versa. Elements without onlyShowOn appear in both.
 *
 * @param {{ aspectRatio, backgrounds, elements, mobile }} sceneData
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

function renderBg(bg) {
  const layerStyle = `left:${bg.x}%;top:${bg.y}%;width:${bg.scale}%`;
  return `<div class="scene-nav-bg-layer" style="${layerStyle}"><img src="${escAttr(bg.image)}" alt="" draggable="false" /></div>`;
}

function renderElement(el) {
  const labelHtml = el.label
    ? `<span class="scene-nav-label">${escText(el.label)}</span>`
    : "";

  // type switch — "image" is the only type for now; extend here for "text", "video", etc.
  let inner;
  if (el.type === "image" || !el.type) {
    inner = `<img src="${escAttr(el.image)}" alt="${escAttr(el.label || "")}" draggable="false" />${labelHtml}`;
  } else {
    inner = labelHtml; // future types render their own content
  }

  return `<div class="scene-nav-el"
  data-glow="${escAttr(el.glow)}"
  data-glow-intensity="${escAttr(String(el.glowIntensity))}"
  data-action="${escAttr(el.action)}"
  data-value="${escAttr(el.value || "")}"
  data-rotation="${escAttr(String(el.rotation))}"
  data-reset-rotation-on-hover="${escAttr(String(el.resetRotationOnHover))}"
  style="left:${el.x}%;top:${el.y}%;width:${el.scale}%;transform:rotate(${el.rotation}deg);">
  ${inner}
</div>`;
}

function buildContainer(backgrounds, elements, aspectRatio, maxWidth, extraClass) {
  const containerStyle = [
    `max-width:${maxWidth}`,
    aspectRatio ? `aspect-ratio:${aspectRatio}` : "",
    aspectRatio ? "overflow:hidden" : "",
  ].filter(Boolean).join(";");

  const bgHtml  = backgrounds.map(renderBg).join("\n");
  const elsHtml = elements.map(renderElement).join("\n");
  const cls = ["scene-nav-container", extraClass].filter(Boolean).join(" ");

  return `<div class="${cls}" style="${containerStyle}">
${bgHtml}
${elsHtml}
</div>`;
}

function visibleOn(el, platform) {
  return !el.onlyShowOn || el.onlyShowOn.includes(platform);
}

export function render(sceneData, settings = {}) {
  const { aspectRatio, backgrounds, elements, mobile } = sceneData;
  const maxWidth = settings.maxWidth || "900px";

  // No mobile layout — single container, backward compatible, no wrapper needed
  if (!mobile) {
    return buildContainer(backgrounds, elements, aspectRatio, maxWidth, "");
  }

  // Desktop container
  const desktopElements = elements.filter(el => visibleOn(el, "desktop"));
  const desktopHtml = buildContainer(
    backgrounds,
    desktopElements,
    aspectRatio,
    maxWidth,
    "scene-nav--desktop"
  );

  // Mobile container — apply mobileOverride onto each element via spread merge
  const mobileElements = elements
    .filter(el => visibleOn(el, "mobile"))
    .map(el => el.mobileOverride ? { ...el, ...el.mobileOverride } : el);
  const mobileBgs         = mobile.backgrounds.length > 0 ? mobile.backgrounds : backgrounds;
  const mobileAspectRatio = mobile.aspectRatio || aspectRatio;
  const mobileHtml = buildContainer(
    mobileBgs,
    mobileElements,
    mobileAspectRatio,
    maxWidth,
    "scene-nav--mobile"
  );

  // Unique wrapper ID scopes the media query so multiple scenes on one page don't conflict
  const id = "snav-" + Math.random().toString(36).slice(2, 8);
  const bp = mobile.breakpoint;

  const styleBlock = `<style>
@media (max-width:${bp}px){#${id} .scene-nav--desktop{display:none}}
@media (min-width:${bp + 1}px){#${id} .scene-nav--mobile{display:none}}
</style>`;

  return `${styleBlock}
<div id="${id}" class="scene-nav-wrapper">
${desktopHtml}
${mobileHtml}
</div>`;
}
