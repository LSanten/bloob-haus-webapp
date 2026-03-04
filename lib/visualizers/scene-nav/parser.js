/**
 * Scene Nav Visualizer — Parser
 *
 * Pure function: YAML string (from inside a ```scene-nav code fence) → scene data object.
 * No side effects, JSON-serializable output.
 *
 * Supports:
 *   - aspectRatio: "16/9"
 *   - background: filename          (shorthand, single full-width bg)
 *   - backgrounds: [{image, x, y, scale}]
 *   - elements: [{image, x, y, scale, rotation, resetRotationOnHover, label, glow, glowIntensity, action, value}]
 *   - Obsidian image syntax: ![](path/to/file.png) → stripped to plain path
 *
 * Note: keep in sync with the builder's import parser in
 *   lib/magic-machines/scene-nav-builder/app/index.html (parseCodeFence).
 *   See docs/architecture/magic-machines.md — "Shared Logic" section.
 *
 * @param {string} yamlString - Raw YAML content from inside the code fence
 * @returns {{ aspectRatio: string|null, backgrounds: Array, elements: Array }}
 */

import jsYaml from "js-yaml";

const DEFAULTS = {
  glow:          "#FFD700",
  glowIntensity: 1,
  action:        "filter",
};

export function parse(yamlString) {
  // Pre-process: strip Obsidian image syntax ![]( path ) before js-yaml sees it.
  // YAML interprets ! as a type tag, causing parse errors on ![](path) values.
  const cleaned = yamlString.replace(/!\[\]\(([^)]+)\)/g, (_, path) => path);

  let raw = {};
  try {
    raw = jsYaml.load(cleaned) || {};
  } catch (e) {
    console.warn(`[scene-nav] YAML parse error: ${e.message}`);
    return { aspectRatio: null, backgrounds: [], elements: [] };
  }

  // Backgrounds: support both shorthand `background: filename`
  // and full `backgrounds: [{image, x, y, scale}]`
  let backgrounds = [];
  if (raw.backgrounds && Array.isArray(raw.backgrounds)) {
    backgrounds = raw.backgrounds.map(bg => ({
      image: String(bg.image || ""),
      x:     Number(bg.x)     || 0,
      y:     Number(bg.y)     || 0,
      scale: Number(bg.scale) || 100,
    }));
  } else if (raw.background) {
    backgrounds = [{ image: String(raw.background), x: 0, y: 0, scale: 100 }];
  }

  const elements = (raw.elements || []).map((el) => ({
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
  }));

  return {
    aspectRatio: raw.aspectRatio || null,
    backgrounds,
    elements,
  };
}
