/**
 * Scene Nav Builder — side panel UI.
 *
 * Mounts a fixed right-hand panel over the page: scene settings, element list,
 * selected-element property form, mobile-layout mode, export menu.
 * Two-way binding: dragging on the canvas updates the form; form edits update
 * the live element styles and the scene data model.
 *
 * Styles are injected from a template string (snb- prefix) so the builder
 * bundle stays a single JS file — no CSS import (bundler has no CSS handling).
 */
import { serializeBlock } from "../parser.js";
import { makeDraggable } from "./drag.js";
import { generateEmbedHtml } from "./embed-serializer.js";

const CSS = `
.snb-panel{position:fixed;top:0;right:0;bottom:0;width:300px;z-index:9999;overflow-y:auto;
  background:#171223;color:#eee;font:13px/1.5 system-ui,sans-serif;padding:14px;box-shadow:-4px 0 24px rgba(0,0,0,.4)}
body.snb-open{padding-right:300px}
.snb-panel h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:14px 0 6px;color:#9d8fc4}
.snb-panel h3:first-child{margin-top:0}
.snb-row{display:flex;align-items:center;gap:6px;margin:4px 0}
.snb-row label{flex:0 0 84px;color:#b7aed6;font-size:12px}
.snb-row input,.snb-row select{flex:1;background:#241c38;border:1px solid #3c2f5c;color:#eee;
  border-radius:4px;padding:3px 6px;font-size:12px;min-width:0}
.snb-list{list-style:none;margin:0;padding:0}
.snb-list li{padding:4px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.snb-list li.snb-sel{background:#3c2f5c}
.snb-btn{display:block;width:100%;margin:6px 0;padding:7px;border:0;border-radius:5px;cursor:pointer;
  background:#5b4a8a;color:#fff;font-size:12.5px}
.snb-btn:hover{background:#6d5aa5}
.snb-toggle{background:#241c38;border:1px solid #3c2f5c}
.snb-toggle.snb-on{background:#2e6b4f;border-color:#3f9c72}
.snb-toast{position:fixed;bottom:16px;right:316px;background:#2e6b4f;color:#fff;padding:8px 14px;
  border-radius:6px;z-index:10000;font:13px system-ui,sans-serif}
.snb-outline{outline:2px dashed #9d8fc4;outline-offset:2px;cursor:grab}
.snb-outline.snb-sel-el{outline:2px solid #ffd700}
`;

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children) el.append(c);
  return el;
}

function toast(msg) {
  const t = h("div", { class: "snb-toast" }, [msg]);
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

export function initPanel(root, scene) {
  document.head.append(h("style", {}, [CSS]));
  document.body.classList.add("snb-open");

  // Builder edits the visible container; mobile mode switches to the mobile one.
  let mobileMode = false;
  const containers = root.classList.contains("scene-nav-container")
    ? { desktop: root, mobile: null }
    : {
        desktop: root.querySelector(".scene-nav--desktop"),
        mobile: root.querySelector(".scene-nav--mobile"),
      };
  const container = () => (mobileMode && containers.mobile) || containers.desktop;

  let selected = 0;
  const cleanups = [];

  // ----- data helpers ----------------------------------------------------
  // In mobile mode, edits write to mobileOverride; otherwise to the element itself.
  function writeVal(el, key, val) {
    if (mobileMode) {
      el.mobileOverride = el.mobileOverride || {};
      el.mobileOverride[key] = val;
    } else {
      el[key] = val;
    }
  }
  function readVal(el, key) {
    if (mobileMode && el.mobileOverride && el.mobileOverride[key] !== undefined)
      return el.mobileOverride[key];
    return el[key];
  }

  // ----- canvas wiring ---------------------------------------------------
  function domEls() {
    return [...container().querySelectorAll(".scene-nav-el")];
  }
  function applyToDom(i) {
    const el = scene.elements[i];
    const node = domEls()[i];
    if (!node) return;
    node.style.left = `${readVal(el, "x")}%`;
    node.style.top = `${readVal(el, "y")}%`;
    node.style.width = `${readVal(el, "scale")}%`;
    node.style.transform = `rotate(${readVal(el, "rotation") || 0}deg)`;
  }
  function wireCanvas() {
    cleanups.splice(0).forEach((fn) => fn());
    domEls().forEach((node, i) => {
      node.classList.add("snb-outline");
      node.classList.toggle("snb-sel-el", i === selected);
      cleanups.push(
        makeDraggable(node, container(), ({ x, y, scale }) => {
          const el = scene.elements[i];
          writeVal(el, "x", x);
          writeVal(el, "y", y);
          writeVal(el, "scale", scale);
          select(i);
        })
      );
      const onClick = (e) => { e.preventDefault(); e.stopPropagation(); select(i); };
      node.addEventListener("click", onClick, true);
      cleanups.push(() => node.removeEventListener("click", onClick, true));
    });
  }

  // ----- panel -----------------------------------------------------------
  const panel = h("aside", { class: "snb-panel" });
  document.body.append(panel);

  function field(label, key, type = "number", step = "0.1") {
    const el = scene.elements[selected];
    const input = h("input", {
      type, step, value: readVal(el, key) ?? "",
      oninput: (e) => {
        const v = type === "number" ? Number(e.target.value) : e.target.value;
        writeVal(el, key, v);
        applyToDom(selected);
      },
    });
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), input]);
  }

  function select(i) {
    selected = i;
    renderPanel();
    wireCanvas();
  }

  function renderPanel() {
    panel.replaceChildren();
    const el = scene.elements[selected];

    panel.append(h("h3", {}, ["Scene"]));
    panel.append(h("div", { class: "snb-row" }, [
      h("label", {}, ["aspectRatio"]),
      h("input", { value: scene.aspectRatio || "", oninput: (e) => (scene.aspectRatio = e.target.value || null) }),
    ]));
    panel.append(h("div", { class: "snb-row" }, [
      h("label", {}, ["edgeFade"]),
      h("input", { type: "number", step: "0.01", value: scene.edgeFade || 0, oninput: (e) => (scene.edgeFade = Number(e.target.value)) }),
    ]));
    if (containers.mobile) {
      const btn = h("button", { class: `snb-btn snb-toggle${mobileMode ? " snb-on" : ""}` }, [
        mobileMode ? "editing MOBILE layout — switch to desktop" : "edit mobile layout",
      ]);
      btn.addEventListener("click", () => {
        mobileMode = !mobileMode;
        // Show the container being edited regardless of viewport media query
        containers.desktop.style.display = mobileMode ? "none" : "block";
        containers.mobile.style.display = mobileMode ? "block" : "none";
        renderPanel();
        wireCanvas();
      });
      panel.append(btn);
    }

    panel.append(h("h3", {}, ["Elements"]));
    panel.append(h("ul", { class: "snb-list" },
      scene.elements.map((e2, i) =>
        h("li", { class: i === selected ? "snb-sel" : "", onclick: () => select(i) },
          [e2.alt || e2.label || e2.image.split("/").pop()])
      )
    ));

    if (el) {
      panel.append(h("h3", {}, [mobileMode ? "Selected (mobile override)" : "Selected"]));
      panel.append(field("x", "x"));
      panel.append(field("y", "y"));
      panel.append(field("scale", "scale"));
      panel.append(field("rotation", "rotation", "number", "1"));
      if (!mobileMode) {
        panel.append(field("glow", "glow", "text"));
        panel.append(field("glowIntensity", "glowIntensity", "number", "0.1"));
        panel.append(field("label", "label", "text"));
        panel.append(field("goto / value", "value", "text"));
      }
    }

    panel.append(h("h3", {}, ["Export"]));
    const copyBlock = h("button", { class: "snb-btn" }, ["Copy ::: block"]);
    copyBlock.addEventListener("click", async () => {
      await navigator.clipboard.writeText(serializeBlock(scene));
      toast("::: block copied — paste into Obsidian");
    });
    panel.append(copyBlock);

    const copyEmbed = h("button", { class: "snb-btn" }, ["Copy embed HTML (Shopify)"]);
    copyEmbed.addEventListener("click", async () => {
      let cssText = "";
      try {
        cssText = await (await fetch("/assets/css/visualizers/scene-nav.css")).text();
      } catch { /* embed still works, unstyled positioning is inline anyway */ }
      const embed = generateEmbedHtml(scene, { cssText, baseUrl: window.location.origin });
      await navigator.clipboard.writeText(embed);
      toast("Embed HTML copied");
    });
    panel.append(copyEmbed);
  }

  renderPanel();
  wireCanvas();
  console.log("[scene-nav-builder] ready — drag to position, Shift+drag to scale");
}
