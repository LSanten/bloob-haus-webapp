/**
 * Scene Nav Visualizer — Parser
 *
 * Pure function: YAML string (from inside a ```scene-nav code fence) → scene data object.
 * No side effects, JSON-serializable output.
 *
 * Supports:
 *   - aspectRatio: "16/9"
 *   - background: filename          (shorthand, single full-width bg)
 *   - backgrounds: [{image, x, y, scale, rotation, mobile: {...overrides}}]
 *   - elements: [{type, image, x, y, scale, rotation, resetRotationOnHover, label,
 *                 glow, glowIntensity, action, value, onlyShowOn, mobile: {...overrides}}]
 *   - mobile: { breakpoint, aspectRatio, background, backgrounds }
 *   - Obsidian image syntax: ![](path/to/file.png) → stripped to plain path
 *
 * Element type defaults to "image". Future types: "text", "video", etc.
 * onlyShowOn: null (show everywhere) | ["desktop"] | ["mobile"] | ["mobile","tablet"]
 * mobileOverride: merged over desktop values when rendering the mobile container.
 *
 * Note: keep in sync with the builder's import parser in
 *   lib/magic-machines/scene-nav-builder/app/index.html (parseCodeFence).
 *   See docs/architecture/magic-machines.md — "Shared Logic" section.
 *
 * @param {string} yamlString - Raw YAML content from inside the code fence
 * @returns {{ aspectRatio: string|null, backgrounds: Array, elements: Array, mobile: object|null }}
 */

import jsYaml from "js-yaml";

const DEFAULTS = {
  type:          "image",
  glow:          "#FFD700",
  glowIntensity: 1,
  action:        "filter",
};

function normalizeBackground(bg) {
  return {
    image:          String(bg.image || ""),
    x:              Number(bg.x)        || 0,
    y:              Number(bg.y)        || 0,
    scale:          Number(bg.scale)    || 100,
    rotation:       Number(bg.rotation) || 0,
    mobileOverride: bg.mobile && typeof bg.mobile === "object" ? normalizeElementOverride(bg.mobile) : null,
  };
}

function parseBackgrounds(raw) {
  if (raw.backgrounds && Array.isArray(raw.backgrounds)) {
    return raw.backgrounds.map(normalizeBackground);
  } else if (raw.background) {
    return [{ image: String(raw.background), x: 0, y: 0, scale: 100, rotation: 0, mobileOverride: null }];
  }
  return [];
}

function parseOnlyShowOn(val) {
  if (!val) return null;
  return String(val).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Normalizes only the fields that are present — used for per-element mobile overrides
// so that absent fields don't clobber desktop defaults during merge.
function normalizeElementOverride(raw) {
  const result = {};
  if (raw.type               !== undefined) result.type               = String(raw.type);
  if (raw.image              !== undefined) result.image              = String(raw.image);
  if (raw.x                  !== undefined) result.x                  = Number(raw.x)             || 0;
  if (raw.y                  !== undefined) result.y                  = Number(raw.y)             || 0;
  if (raw.scale              !== undefined) result.scale              = Number(raw.scale)         || 18;
  if (raw.rotation           !== undefined) result.rotation           = Number(raw.rotation)      || 0;
  if (raw.resetRotationOnHover !== undefined) result.resetRotationOnHover = raw.resetRotationOnHover !== false;
  if (raw.label              !== undefined) result.label              = raw.label || null;
  if (raw.glow               !== undefined) result.glow               = raw.glow;
  if (raw.glowIntensity      !== undefined) result.glowIntensity      = Number(raw.glowIntensity) || DEFAULTS.glowIntensity;
  if (raw.action             !== undefined) result.action             = raw.action;
  if (raw.value              !== undefined) result.value              = raw.value || null;
  return result;
}

export function parse(yamlString) {
  // Pre-process: strip Obsidian image syntax ![]( path ) before js-yaml sees it.
  // YAML interprets ! as a type tag, causing parse errors on ![](path) values.
  const cleaned = yamlString.replace(/!\[\]\(([^)]+)\)/g, (_, path) => path);

  let raw = {};
  try {
    raw = jsYaml.load(cleaned) || {};
  } catch (e) {
    console.warn(`[scene-nav] YAML parse error: ${e.message}`);
    return { aspectRatio: null, backgrounds: [], elements: [], mobile: null };
  }

  const backgrounds = parseBackgrounds(raw);

  // Mobile top-level block — breakpoint, alternate aspect ratio, alternate backgrounds
  let mobile = null;
  if (raw.mobile && typeof raw.mobile === "object") {
    mobile = {
      breakpoint:  Number(raw.mobile.breakpoint) || 768,
      aspectRatio: raw.mobile.aspectRatio || null,
      backgrounds: parseBackgrounds(raw.mobile),
    };
  }

  const elements = (raw.elements || []).map((el) => ({
    type:                String(el.type || DEFAULTS.type),
    image:               String(el.image || ""),
    x:                   Number(el.x)             || 0,
    y:                   Number(el.y)             || 0,
    scale:               Number(el.scale)         || 18,
    rotation:            Number(el.rotation)      || 0,
    resetRotationOnHover: el.resetRotationOnHover !== false,
    label:               el.label                 || null,
    glow:                el.glow                  || DEFAULTS.glow,
    glowIntensity:       Number(el.glowIntensity) || DEFAULTS.glowIntensity,
    action:              el.action                || DEFAULTS.action,
    value:               el.value                 || null,
    flipH:               el.flipH === true,
    flipV:               el.flipV === true,
    onlyShowOn:          parseOnlyShowOn(el.onlyShowOn),
    mobileOverride:      el.mobile ? normalizeElementOverride(el.mobile) : null,
  }));

  return {
    aspectRatio: raw.aspectRatio || null,
    edgeFade:    Number(raw.edgeFade) || 0,
    backgrounds,
    elements,
    mobile,
  };
}
