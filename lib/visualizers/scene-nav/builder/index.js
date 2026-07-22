/**
 * Scene Nav Builder — debug-mode overlay entry point (icon-first).
 *
 * Lazy-loaded by ../browser.js for every scene with `debug: on`. Instead of opening
 * the sidebar immediately, it mounts a small "✎ edit" icon on the scene's artboard —
 * so several debug scenes can coexist without cluttering the page. Clicking the icon
 * opens ONE shared sidebar bound to that scene (closing any other), via panel.js.
 *
 * Reads the scene from the JSON blob the renderer emits in debug mode (pre-resolution
 * source when available, so the builder round-trips authored refs).
 */
import { initPanel } from "./panel.js";

let activePanel = null;

function ensureIconStyle() {
  if (document.getElementById("snb-icon-style")) return;
  const s = document.createElement("style");
  s.id = "snb-icon-style";
  s.textContent =
    ".snb-edit-icon{position:absolute;top:10px;right:10px;z-index:50;display:inline-flex;" +
    "align-items:center;gap:6px;padding:8px 14px;border-radius:20px;border:1px solid #a596e0;" +
    "background:#5b4a8a;color:#fff;cursor:pointer;font:600 12.5px system-ui,sans-serif;" +
    "box-shadow:0 3px 14px rgba(0,0,0,.45)}" +
    ".snb-edit-icon:hover{background:#6d5aa5}";
  document.head.append(s);
}

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

  ensureIconStyle();
  if (getComputedStyle(root).position === "static") root.style.position = "relative";

  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "snb-edit-icon";
  icon.title = "Edit this scene-nav";
  icon.textContent = "✎ Edit scene";
  root.append(icon);

  icon.addEventListener("click", (e) => {
    e.preventDefault();
    if (activePanel) activePanel.close();
    icon.style.display = "none";
    activePanel = initPanel(root, scene, {
      onClose: () => { activePanel = null; icon.style.display = ""; },
    });
  });
}
