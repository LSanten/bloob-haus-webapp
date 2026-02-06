/**
 * Checkbox Tracker Visualizer — Module Entry Point
 *
 * This is a runtime-only visualizer (no build-time transform needed).
 * Checkboxes are already rendered by the markdown engine;
 * the browser.js enhances them with interactivity and persistence.
 *
 * Future build-time visualizers (timeline, recipe-card) will export
 * parse() and render() functions here for use by addTransform.
 */

// Runtime-only: no build-time transform
export const type = "runtime";
export const name = "checkbox-tracker";

// No-op transform — checkbox HTML is already correct from markdown rendering
export function transform(html) {
  return html;
}
