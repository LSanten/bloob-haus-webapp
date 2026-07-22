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
    ".snb-edit-icon{position:absolute;top:8px;right:8px;z-index:50;width:30px;height:30px;" +
    "border-radius:50%;border:1px solid #3c2f5c;background:rgba(23,18,35,.8);color:#c9bdf0;" +
    "cursor:pointer;font-size:15px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.35)}" +
    ".snb-edit-icon:hover{background:#241c38;color:#fff}";
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
  icon.textContent = "✎";
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
