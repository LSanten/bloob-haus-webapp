/**
 * Scene Nav Builder — debug-mode overlay entry point.
 *
 * Lazy-loaded by ../browser.js when a scene has `debug: on`. Reads the scene
 * data from the JSON blob the renderer emits in debug mode, then mounts the
 * side panel + drag handles over the real rendered scene.
 *
 * Consolidates the former lib/magic-machines/scene-nav-builder magic machine:
 * same core (the scene data model), two serializers — the v2 `:::` block
 * (../parser.js serializeBlock) and a self-contained embed HTML (./embed-serializer.js).
 */
import { initPanel } from "./panel.js";

export default function initBuilder(root) {
  const blob = root.querySelector("script.scene-nav-data");
  if (!blob) {
    console.warn("[scene-nav-builder] debug container has no scene-nav-data blob");
    return;
  }
  let scene;
  try {
    scene = JSON.parse(blob.textContent);
  } catch (e) {
    console.warn("[scene-nav-builder] could not parse scene data:", e.message);
    return;
  }
  initPanel(root, scene);
}
