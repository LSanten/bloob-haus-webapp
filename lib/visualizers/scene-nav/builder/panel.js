/**
 * Scene Nav Builder — side panel UI (v2).
 *
 * Opened on demand from the per-shape "✎ edit" icon (see index.js). Manages a
 * selection Set (marquee, Cmd-toggle, Shift-range), on-canvas resize/rotate handles,
 * group move/resize/rotate with relative bulk-edit, editable number fields, a mockup
 * upload, mobile breakpoint/aspect-ratio fields + state chip, and Copy ::: block.
 *
 * Pure logic (selection sets, hit-testing, group transform, mobile-state) lives in
 * selection.js; transform-handle + marquee pointer wiring in handles.js; this file is
 * the DOM/glue. Styles injected from a template string (snb- prefix) — no CSS import.
 */
import { serializeBlock } from "../parser.js";
import { OVERLAYS, resolveOverlay } from "../overlays.js";
import { makeDraggable } from "./drag.js";
import {
  elementsInRect, rangeSelect, toggle, mobileState,
  groupBBox, scaleGroup, moveGroup, rotateGroupPositions,
} from "./selection.js";
import { mountElementHandles, mountGroupHandles, mountMarquee } from "./handles.js";

const GLOW_PRESETS = ["#FF5252", "#FF8A65", "#FFD700", "#69F0AE", "#00E5FF", "#448AFF", "#B388FF", "#FFFFFF"];
const OVERLAY_COLORS = [["#ffffff", "bright"], ["#3f3f3f", "dark grey"], ["#000000", "black"], ["#2e7d32", "green"], ["#1565c0", "blue"]];

const CSS = `
.snb-panel{position:fixed;top:0;right:0;bottom:0;width:300px;z-index:9999;overflow-y:auto;
  background:#171223;color:#eee;font:13px/1.5 system-ui,sans-serif;box-shadow:-4px 0 24px rgba(0,0,0,.4)}
body.snb-open{padding-right:300px}
.snb-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;
  background:#120e1c;padding:10px 14px;border-bottom:1px solid #2a2140;z-index:2}
.snb-head b{font-size:12px;letter-spacing:.06em;color:#c9bdf0;text-transform:uppercase}
.snb-icon{background:#241c38;border:1px solid #3c2f5c;color:#cfc4ee;border-radius:6px;cursor:pointer;width:26px;height:24px;font-size:13px;line-height:1}
.snb-body{padding:6px 14px 24px}
.snb-sec{border-bottom:1px solid #241c38;padding:2px 0}
.snb-sec>summary{cursor:pointer;list-style:none;padding:9px 2px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9d8fc4;display:flex;align-items:center;gap:6px;user-select:none}
.snb-sec>summary::-webkit-details-marker{display:none}
.snb-sec>summary::before{content:"▸";font-size:9px;color:#6b5e93}
.snb-sec[open]>summary::before{content:"▾"}
.snb-secbody{padding:2px 2px 12px}
.snb-row{display:flex;align-items:center;gap:6px;margin:5px 0}
.snb-row>label{flex:0 0 74px;color:#b7aed6;font-size:12px}
.snb-row input[type=text],.snb-row select{flex:1;background:#241c38;border:1px solid #3c2f5c;color:#eee;border-radius:4px;padding:3px 6px;font-size:12px;min-width:0}
.snb-row input[type=range]{flex:1;min-width:0;accent-color:#8f7ad1}
.snb-num{flex:0 0 54px;background:#241c38;border:1px solid #3c2f5c;color:#eee;border-radius:4px;padding:3px 5px;font:11px ui-monospace,monospace;min-width:0}
.snb-list{list-style:none;margin:4px 0;padding:0}
.snb-list li{padding:5px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:7px}
.snb-list li.snb-sel{background:#3c2f5c}
.snb-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.snb-btn{display:block;width:100%;margin:6px 0;padding:8px;border:0;border-radius:5px;cursor:pointer;background:#5b4a8a;color:#fff;font-size:12.5px}
.snb-btn:hover{background:#6d5aa5}
.snb-btn.snb-ghost{background:transparent;border:1px dashed #3c2f5c;color:#b7aed6}
.snb-chip{display:inline-block;font-size:10px;padding:2px 8px;border-radius:10px;background:#241c38;border:1px solid #3c2f5c;color:#9d8fc4;margin:2px 0}
.snb-chip.snb-warn{background:#3a2a10;border-color:#7a5a20;color:#f0c98a}
.snb-seg{display:flex;gap:4px}
.snb-seg button{flex:1;padding:5px 4px;border-radius:5px;border:1px solid #2f2547;background:transparent;color:#9d8fc4;cursor:pointer;font-size:11px}
.snb-seg button.snb-on{background:#2e6b4f;border-color:#3f9c72;color:#fff}
.snb-tgl{padding:3px 12px;border-radius:5px;border:1px solid #2f2547;background:transparent;color:#9d8fc4;cursor:pointer;font:11px ui-monospace,monospace}
.snb-tgl.snb-on{background:#2e6b4f;border-color:#3f9c72;color:#fff}
.snb-swatches{display:flex;flex-wrap:wrap;gap:5px;margin:3px 0}
.snb-sw{width:20px;height:20px;border-radius:5px;cursor:pointer;border:2px solid transparent}
.snb-sw.snb-sel{border-color:#fff;box-shadow:0 0 7px currentColor}
.snb-hint{font-size:10px;color:#6b5e93;margin:2px 0 6px}
.snb-notice{background:#3a2a10;border:1px solid #7a5a20;color:#f0c98a;border-radius:6px;padding:8px 10px;font-size:11px;line-height:1.4;margin:8px 0}
.snb-toast{position:fixed;bottom:16px;right:316px;background:#2e6b4f;color:#fff;padding:8px 14px;border-radius:6px;z-index:10000;font:13px system-ui,sans-serif}
.scene-nav-el.snb-outline{outline:2px dashed #9d8fc4;outline-offset:2px;cursor:grab}
.scene-nav-el.snb-sel-el{outline:2px solid #ffd700}
.scene-nav-container.snb-active,.scene-nav-wrapper.snb-active{outline:3px dashed #a596e0;outline-offset:6px}
.snb-grip{position:absolute;width:14px;height:14px;border-radius:50%;background:#ffd700;border:2px solid #171223;z-index:5;cursor:grab;touch-action:none}
.snb-grip-resize{right:-8px;bottom:-8px;cursor:nwse-resize}
.snb-grip-rotate{left:calc(50% - 7px);top:-26px;background:#8f7ad1;cursor:grab}
.snb-marquee{position:absolute;border:1px solid #8f7ad1;background:rgba(143,122,209,.15);z-index:4;pointer-events:none}
.snb-group-overlay{position:absolute;border:1px dashed #8f7ad1;z-index:4;pointer-events:none}
.snb-group-overlay .snb-grip{pointer-events:auto}
`;

function h(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children)) if (c != null) e.append(c);
  return e;
}
function toast(msg) {
  const t = h("div", { class: "snb-toast" }, [msg]);
  document.body.append(t);
  setTimeout(() => t.remove(), 2000);
}

export function initPanel(root, scene, { onClose } = {}) {
  if (!document.getElementById("snb-style")) {
    document.head.append(h("style", { id: "snb-style" }, [CSS]));
  }
  document.body.classList.add("snb-open");
  root.classList.add("snb-active");

  let mobileMode = false;
  const mockups = [];
  const objectUrls = new Map();

  const containers = root.classList.contains("scene-nav-container")
    ? { desktop: root, mobile: null }
    : { desktop: root.querySelector(".scene-nav--desktop"), mobile: root.querySelector(".scene-nav--mobile") };
  const container = () => (mobileMode && containers.mobile) || containers.desktop;

  let selection = new Set(scene.elements.length ? [0] : []);
  let primary = scene.elements.length ? 0 : null;
  const cleanups = [];
  let handleCleanup = null;
  let groupOverlay = null;

  function writeVal(el, key, val) {
    if (mobileMode) { el.mobileOverride = el.mobileOverride || {}; el.mobileOverride[key] = val; }
    else el[key] = val;
  }
  function readVal(el, key) {
    if (mobileMode && el.mobileOverride && el.mobileOverride[key] !== undefined) return el.mobileOverride[key];
    return el[key];
  }
  function domEls() { return [...container().querySelectorAll(".scene-nav-el")]; }
  // Live-preview the overlay: recompute the same CSS vars the renderer emits and set them
  // on the element node. Mask = the node's own rendered <img> src (already resolved).
  function applyOverlayToDom(i) {
    const el = scene.elements[i]; const node = domEls()[i];
    if (!node) return;
    const o = resolveOverlay(el.overlay, {
      color: el.overlayColor,
      strength: el.overlayStrength != null ? el.overlayStrength / 100 : undefined,
    });
    const props = ["--snb-overlay", "--snb-overlay-mask", "--snb-overlay-color", "--snb-overlay-bgblend", "--snb-overlay-blend", "--snb-overlay-opacity"];
    if (!o) { node.classList.remove("has-overlay"); props.forEach((p) => node.style.removeProperty(p)); return; }
    const img = node.querySelector("img");
    node.classList.add("has-overlay");
    node.style.setProperty("--snb-overlay", `url('${o.url}')`);
    node.style.setProperty("--snb-overlay-mask", `url('${img ? img.getAttribute("src") : ""}')`);
    node.style.setProperty("--snb-overlay-color", o.color);
    node.style.setProperty("--snb-overlay-bgblend", o.bgBlend);
    node.style.setProperty("--snb-overlay-blend", o.blend);
    node.style.setProperty("--snb-overlay-opacity", String(o.opacity));
  }
  function applyToDom(i) {
    const el = scene.elements[i]; const node = domEls()[i];
    if (!node) return;
    node.style.left = `${readVal(el, "x")}%`;
    node.style.top = `${readVal(el, "y")}%`;
    node.style.width = `${readVal(el, "scale")}%`;
    const rot = readVal(el, "rotation") || 0;
    const flip = (el.flipH ? " scaleX(-1)" : "") + (el.flipV ? " scaleY(-1)" : "");
    node.style.transform = `rotate(${rot}deg)${flip}`;
  }
  const indices = () => [...selection];

  // ── selection ──────────────────────────────────────────────────────────
  function setSelection(next, prim) {
    selection = new Set(next);
    if (prim != null) primary = prim;
    else if (!selection.has(primary)) primary = selection.size ? [...selection][selection.size - 1] : null;
    renderPanel(); wireCanvas();
  }
  function pick(i, { additive, range } = {}) {
    if (additive) setSelection(toggle(selection, i), i);
    else if (range && primary != null) setSelection(rangeSelect(scene.elements.length, primary, i), primary);
    else setSelection([i], i);
  }

  // ── canvas wiring ──────────────────────────────────────────────────────
  function refreshHandles() {
    if (handleCleanup) { handleCleanup(); handleCleanup = null; }
    if (groupOverlay) { groupOverlay.remove(); groupOverlay = null; }
    const idx = indices();
    if (idx.length === 1) {
      const i = idx[0]; const node = domEls()[i]; const el = scene.elements[i];
      if (!node) return;
      handleCleanup = mountElementHandles(node, container(), {
        getScale: () => readVal(el, "scale"),
        setScale: (s) => { writeVal(el, "scale", Math.round(s * 10) / 10); applyToDom(i); syncFields(); },
        setRotation: (r) => { writeVal(el, "rotation", r); applyToDom(i); syncFields(); },
        getCenterPx: () => { const b = node.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; },
        onEnd: () => renderPanel(),
      });
    } else if (idx.length > 1) {
      const box = groupBBox(scene.elements, idx);
      groupOverlay = h("div", { class: "snb-group-overlay" });
      Object.assign(groupOverlay.style, { left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` });
      container().append(groupOverlay);
      handleCleanup = mountGroupHandles(groupOverlay, container(), {
        onScale: (factor) => applyGroupScale(factor),
        onRotate: (deg) => applyGroupRotate(deg),
        getBoxPx: () => {
          const cb = container().getBoundingClientRect();
          const cx = cb.left + ((box.x + box.w / 2) / 100) * cb.width;
          const cy = cb.top + ((box.y + box.h / 2) / 100) * cb.height;
          const halfDiag = Math.hypot((box.w / 200) * cb.width, (box.h / 200) * cb.height);
          return { cx, cy, halfDiag };
        },
        onEnd: () => { renderPanel(); wireCanvas(); },
      });
    }
  }
  function wireCanvas() {
    cleanups.splice(0).forEach((fn) => fn());
    let dragging = false, startPos = null;
    domEls().forEach((node, i) => {
      node.classList.add("snb-outline");
      node.classList.toggle("snb-sel-el", selection.has(i));
      // While editing, a click on an element must ONLY select it — never fire its
      // goto/navigation (browser.js's click handler). Block the click in the capture
      // phase so it never reaches that bubble listener.
      const blockNav = (e) => { e.preventDefault(); e.stopPropagation(); };
      node.addEventListener("click", blockNav, true);
      cleanups.push(() => node.removeEventListener("click", blockNav, true));
      cleanups.push(makeDraggable(node, container(), {
        onStart: (e) => {
          if (e.metaKey || e.ctrlKey) { pick(i, { additive: true }); dragging = false; }
          else if (e.shiftKey) { pick(i, { range: true }); dragging = false; }
          else { if (!selection.has(i)) pick(i); dragging = true; startPos = new Map(indices().map((j) => [j, { x: readVal(scene.elements[j], "x"), y: readVal(scene.elements[j], "y") }])); }
        },
        onDrag: ({ dx, dy }) => {
          if (!dragging) return;
          for (const j of indices()) { const s = startPos.get(j); writeVal(scene.elements[j], "x", Math.round((s.x + dx) * 10) / 10); writeVal(scene.elements[j], "y", Math.round((s.y + dy) * 10) / 10); applyToDom(j); }
          if (groupOverlay) { const b = groupBBox(scene.elements, indices()); Object.assign(groupOverlay.style, { left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }); }
        },
        onEnd: () => { if (dragging) { dragging = false; renderPanel(); } },
      }));
    });
    cleanups.push(mountMarquee(container(), {
      isEmptyTarget: (e) => !e.target.closest(".scene-nav-el"),
      onSelect: (rect) => { const hit = elementsInRect(scene.elements.map((el) => ({ x: readVal(el, "x"), y: readVal(el, "y"), scale: readVal(el, "scale") })), rect); setSelection(hit, hit[hit.length - 1] ?? null); },
      onEmptyClick: () => setSelection([], null),
    }));
    refreshHandles();
  }

  function applyGroupScale(factor) {
    for (const r of scaleGroup(scene.elements.map((el) => ({ x: readVal(el, "x"), y: readVal(el, "y"), scale: readVal(el, "scale") })), indices(), factor)) {
      writeVal(scene.elements[r.i], "x", Math.round(r.x * 10) / 10);
      writeVal(scene.elements[r.i], "y", Math.round(r.y * 10) / 10);
      writeVal(scene.elements[r.i], "scale", Math.round(r.scale * 10) / 10);
      applyToDom(r.i);
    }
    refreshHandles();
  }
  function applyGroupRotate(deg) {
    const snap = scene.elements.map((el) => ({ x: readVal(el, "x"), y: readVal(el, "y"), scale: readVal(el, "scale") }));
    for (const r of rotateGroupPositions(snap, indices(), deg)) {
      writeVal(scene.elements[r.i], "x", Math.round(r.x * 10) / 10);
      writeVal(scene.elements[r.i], "y", Math.round(r.y * 10) / 10);
      const cur = readVal(scene.elements[r.i], "rotation") || 0;
      writeVal(scene.elements[r.i], "rotation", Math.round(cur + deg));
      applyToDom(r.i);
    }
    refreshHandles();
  }
  function applyGroupMove(dx, dy) {
    for (const r of moveGroup(scene.elements.map((el) => ({ x: readVal(el, "x"), y: readVal(el, "y") })), indices(), dx, dy)) {
      writeVal(scene.elements[r.i], "x", Math.round(r.x * 10) / 10);
      writeVal(scene.elements[r.i], "y", Math.round(r.y * 10) / 10);
      applyToDom(r.i);
    }
    refreshHandles();
  }

  // ── mockup upload ──────────────────────────────────────────────────────
  function addFromFile(file, asBackground) {
    const url = URL.createObjectURL(file); const name = file.name;
    objectUrls.set(name, url); if (!mockups.includes(name)) mockups.push(name);
    if (asBackground) {
      scene.backgrounds.push({ image: name, alt: "", x: 0, y: 0, scale: 100, rotation: 0, mobileOverride: null });
    } else {
      scene.elements.push({ type: "image", image: name, alt: name.replace(/\.[^.]+$/, ""), x: 45, y: 45, scale: 18, rotation: 0, resetRotationOnHover: true, label: false, glow: "#FFD700", glowIntensity: 1, hoverGlow: true, hoverScale: true, action: "link", value: null, flipH: false, flipV: false, onlyShowOn: null, mobileOverride: null });
      const node = h("div", { class: "scene-nav-el", style: "left:45%;top:45%;width:18%;transform:rotate(0deg);" });
      node.append(h("img", { src: url, alt: "", draggable: "false" }));
      containers.desktop.append(node);
      setSelection([scene.elements.length - 1], scene.elements.length - 1);
    }
    renderPanel(); wireCanvas();
    toast(asBackground ? "Background added (mockup)" : "Element added (mockup)");
  }

  // ── field helpers ──────────────────────────────────────────────────────
  function numRow(label, key, min, max, step) {
    const el = scene.elements[primary];
    const num = h("input", { class: "snb-num", type: "number", step, value: readVal(el, key) ?? 0 });
    const range = h("input", { type: "range", min, max, step, value: readVal(el, key) ?? 0 });
    const set = (v) => { writeVal(el, key, Number(v)); num.value = v; range.value = v; applyToDom(primary); refreshHandles(); };
    num.addEventListener("input", (e) => set(e.target.value));
    range.addEventListener("input", (e) => set(e.target.value));
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), range, num]);
  }
  function syncFields() { renderPanel(); }
  function textRow(label, get, set, placeholder) {
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), h("input", { type: "text", value: get() ?? "", placeholder, oninput: (e) => set(e.target.value) })]);
  }
  function toggleRow(label, isOn, onToggle) {
    const btn = h("button", { class: `snb-tgl${isOn ? " snb-on" : ""}` }, [isOn ? "ON" : "OFF"]);
    btn.addEventListener("click", () => onToggle(!isOn));
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), h("div", { style: "flex:1" }), btn]);
  }
  function glowSwatches(getGlow, setGlow) {
    return h("div", { class: "snb-swatches" }, GLOW_PRESETS.map((c) =>
      h("div", { class: `snb-sw${getGlow() === c ? " snb-sel" : ""}`, style: `background:${c};color:${c}`, title: c, onclick: () => { setGlow(c); renderPanel(); } })
    ).concat([h("input", { type: "color", value: getGlow() || "#FFD700", style: "width:24px;height:22px;padding:1px;background:transparent;border:1px solid #3c2f5c;border-radius:4px;cursor:pointer", oninput: (e) => { setGlow(e.target.value); renderPanel(); } })]));
  }
  // Overlay tint swatches (preset colors + a color input). set(color) also live-previews.
  function overlayColorSwatches(getColor, setColor) {
    const cur = (getColor() || "#ffffff").toLowerCase();
    return h("div", { class: "snb-swatches", style: "flex:1" }, OVERLAY_COLORS.map(([c, t]) =>
      h("div", { class: `snb-sw${cur === c ? " snb-sel" : ""}`, style: `background:${c};color:${c}`, title: t, onclick: () => { setColor(c); renderPanel(); } })
    ).concat([h("input", { type: "color", value: getColor() || "#ffffff", style: "width:24px;height:22px;padding:1px;background:transparent;border:1px solid #3c2f5c;border-radius:4px;cursor:pointer", oninput: (e) => setColor(e.target.value) })]));
  }
  // A range+number row whose value is applied via apply(v) — used for single + bulk edits.
  function rangeRow(label, get, apply, min, max, step) {
    const v = get();
    const range = h("input", { type: "range", min, max, step, value: v });
    const num = h("input", { class: "snb-num", type: "number", min, max, step, value: v });
    const set = (x) => { apply(Number(x)); range.value = x; num.value = x; };
    range.addEventListener("input", (e) => set(e.target.value));
    num.addEventListener("input", (e) => set(e.target.value));
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), range, num]);
  }
  function section(title, open, children) {
    return h("details", { class: "snb-sec", open }, [h("summary", {}, [title]), h("div", { class: "snb-secbody" }, [].concat(children))]);
  }

  // ── panel ──────────────────────────────────────────────────────────────
  const panel = h("aside", { class: "snb-panel" });
  document.body.append(panel);

  function close() {
    cleanups.splice(0).forEach((fn) => fn());
    if (handleCleanup) handleCleanup();
    if (groupOverlay) groupOverlay.remove();
    domEls().forEach((n) => n.classList.remove("snb-outline", "snb-sel-el"));
    root.classList.remove("snb-active");
    document.body.classList.remove("snb-open");
    panel.remove();
    onClose && onClose();
  }

  function renderPanel() {
    panel.replaceChildren();
    panel.append(h("div", { class: "snb-head" }, [h("b", {}, ["scene-nav builder"]), h("button", { class: "snb-icon", title: "Close", onclick: close }, ["✕"])]));
    const body = h("div", { class: "snb-body" });
    panel.append(body);

    // Scene + mobile
    const ms = mobileState(scene);
    const sceneRows = [
      textRow("aspectRatio", () => scene.aspectRatio, (v) => (scene.aspectRatio = v || null)),
      textRow("edgeFade", () => scene.edgeFade || 0, (v) => (scene.edgeFade = Number(v) || 0)),
    ];
    if (scene.mobile) {
      sceneRows.push(h("div", { class: "snb-row" }, [h("label", {}, ["mobile bp"]), h("input", { class: "snb-num", type: "number", value: scene.mobile.breakpoint || 768, oninput: (e) => (scene.mobile.breakpoint = Number(e.target.value)) })]));
      sceneRows.push(textRow("mobile a/r", () => scene.mobile.aspectRatio || "", (v) => (scene.mobile.aspectRatio = v || null), scene.aspectRatio || "= desktop"));
      sceneRows.push(h("div", {}, [h("span", { class: `snb-chip${ms.diverged ? " snb-warn" : ""}` }, [ms.diverged ? `Mobile: customized (${ms.overrides})` : "Mobile: same as desktop"])]));
      if (containers.mobile) {
        const b = h("button", { class: `snb-btn${mobileMode ? "" : " snb-ghost"}` }, [mobileMode ? "editing MOBILE — back to desktop" : "edit mobile layout"]);
        b.addEventListener("click", () => { mobileMode = !mobileMode; containers.desktop.style.display = mobileMode ? "none" : "block"; if (containers.mobile) containers.mobile.style.display = mobileMode ? "block" : "none"; renderPanel(); wireCanvas(); });
        sceneRows.push(b);
      }
    } else {
      sceneRows.push(h("button", { class: "snb-btn snb-ghost", onclick: () => { scene.mobile = { breakpoint: 768, aspectRatio: null, backgrounds: [] }; renderPanel(); } }, ["+ add mobile layout"]));
    }
    body.append(section("Scene", true, sceneRows));

    // Add (mockup)
    const fi = h("input", { type: "file", accept: "image/*", style: "display:none" });
    const bi = h("input", { type: "file", accept: "image/*", style: "display:none" });
    fi.addEventListener("change", (e) => e.target.files[0] && addFromFile(e.target.files[0], false));
    bi.addEventListener("change", (e) => e.target.files[0] && addFromFile(e.target.files[0], true));
    const addKids = [fi, bi, h("button", { class: "snb-btn snb-ghost", onclick: () => fi.click() }, ["＋ Add image"]), h("button", { class: "snb-btn snb-ghost", onclick: () => bi.click() }, ["＋ Add background"])];
    if (mockups.length) addKids.push(h("div", { class: "snb-notice", html: "⚠ <b>Mockup preview only.</b> Not saved to your vault — add before publishing:<br>" + mockups.map((m) => "• " + m).join("<br>") }));
    body.append(section("Add image (mockup)", true, addKids));

    // Elements list
    body.append(section("Elements", true, [h("ul", { class: "snb-list" }, scene.elements.map((e2, i) =>
      h("li", { class: selection.has(i) ? "snb-sel" : "", onclick: (ev) => pick(i, { additive: ev.metaKey || ev.ctrlKey, range: ev.shiftKey }) }, [
        h("span", { class: "snb-dot", style: `background:${e2.glow || "#FFD700"}` }),
        h("span", { style: "overflow:hidden;text-overflow:ellipsis" }, [e2.alt || (e2.label && e2.label !== false ? e2.label : "") || String(e2.image).split("/").pop()]),
      ])
    ))]));

    // Selected
    const idx = indices();
    if (idx.length === 1 && primary != null) {
      const el = scene.elements[primary];
      const showLabel = el.label !== false;
      const kids = [
        numRow("x", "x", -50, 150, 0.1), numRow("y", "y", -50, 150, 0.1),
        numRow("scale", "scale", 2, 80, 0.5), numRow("rotation", "rotation", -180, 180, 1),
        h("div", { class: "snb-row" }, [h("label", {}, ["flip"]), h("div", { class: "snb-seg", style: "flex:1" }, [
          h("button", { class: el.flipH ? "snb-on" : "", onclick: () => { el.flipH = !el.flipH; applyToDom(primary); renderPanel(); } }, ["↔ H"]),
          h("button", { class: el.flipV ? "snb-on" : "", onclick: () => { el.flipV = !el.flipV; applyToDom(primary); renderPanel(); } }, ["↕ V"]),
        ])]),
        h("div", { class: "snb-hint" }, ["glow color"]),
        glowSwatches(() => el.glow, (c) => (el.glow = c)),
        numRow("glowInt", "glowIntensity", 0.2, 3, 0.1),
        toggleRow("hover glow", el.hoverGlow !== false, (on) => { el.hoverGlow = on; renderPanel(); }),
        toggleRow("hover big", el.hoverScale !== false, (on) => { el.hoverScale = on; renderPanel(); }),
        toggleRow("show label", showLabel, (on) => { el.label = on ? (el.alt ?? "") : false; renderPanel(); }),
      ];
      if (showLabel) kids.push(textRow("label", () => (el.label === el.alt ? "" : el.label || ""), (v) => (el.label = v || (el.alt ?? "")), el.alt || "(alt)"));
      kids.push(textRow("goto", () => (el.gotoRaw || el.value || ""), (v) => { el.gotoRaw = v; el.value = v; el.action = v.startsWith("#") ? "anchor" : "link"; }, "note.md, /url/, #anchor"));

      // Water overlay — a curated animated loop masked to the artwork.
      kids.push(h("div", { class: "snb-hint" }, ["water overlay"]));
      const ovSel = h("select", { onchange: (e) => { const v = e.target.value; if (v) el.overlay = v; else delete el.overlay; applyOverlayToDom(primary); renderPanel(); } },
        [h("option", { value: "" }, ["None"])].concat(Object.entries(OVERLAYS).map(([id, o]) => h("option", { value: id }, [o.label]))));
      ovSel.value = el.overlay || "";
      kids.push(h("div", { class: "snb-row" }, [h("label", {}, ["overlay"]), ovSel]));
      if (el.overlay) {
        kids.push(h("div", { class: "snb-row" }, [h("label", {}, ["color"]),
          overlayColorSwatches(() => el.overlayColor, (c) => { el.overlayColor = c; applyOverlayToDom(primary); })]));
        kids.push(rangeRow("strength", () => (el.overlayStrength != null ? el.overlayStrength : 70), (v) => { el.overlayStrength = v; applyOverlayToDom(primary); }, 0, 100, 5));
        kids.push(h("div", { class: "snb-hint" }, ["light color = bright water (dark art) · dark = dark water (light art)"]));
      }
      kids.push(h("div", { class: "snb-hint" }, ["drag the corner grip to resize · the top grip to rotate"]));
      kids.push(h("button", { class: "snb-btn snb-ghost", onclick: () => { const n = domEls()[primary]; if (n) n.remove(); scene.elements.splice(primary, 1); setSelection(scene.elements.length ? [Math.max(0, primary - 1)] : [], scene.elements.length ? Math.max(0, primary - 1) : null); } }, ["Remove element"]));
      body.append(section("Selected element", true, kids));
    } else if (idx.length > 1) {
      const kids = [
        h("div", { class: "snb-hint" }, ["controls apply to all selected, relatively"]),
        h("div", { class: "snb-row" }, [h("label", {}, ["resize"]), h("div", { class: "snb-seg", style: "flex:1" }, [
          h("button", { onclick: () => applyGroupScale(0.9) }, ["– smaller"]), h("button", { onclick: () => applyGroupScale(1.1) }, ["+ bigger"]),
        ])]),
        h("div", { class: "snb-row" }, [h("label", {}, ["rotate"]), h("div", { class: "snb-seg", style: "flex:1" }, [
          h("button", { onclick: () => applyGroupRotate(-15) }, ["↺ −15°"]), h("button", { onclick: () => applyGroupRotate(15) }, ["↻ +15°"]),
        ])]),
        h("div", { class: "snb-row" }, [h("label", {}, ["nudge"]), h("div", { class: "snb-seg", style: "flex:1" }, [
          h("button", { onclick: () => applyGroupMove(-2, 0) }, ["←"]), h("button", { onclick: () => applyGroupMove(2, 0) }, ["→"]),
          h("button", { onclick: () => applyGroupMove(0, -2) }, ["↑"]), h("button", { onclick: () => applyGroupMove(0, 2) }, ["↓"]),
        ])]),
        h("div", { class: "snb-hint" }, ["bulk glow (all selected)"]),
        glowSwatches(() => scene.elements[primary]?.glow, (c) => idx.forEach((i) => (scene.elements[i].glow = c))),
        rangeRow("glow strength", () => scene.elements[primary]?.glowIntensity ?? 1, (v) => idx.forEach((i) => (scene.elements[i].glowIntensity = v)), 0.2, 3, 0.1),
        h("div", { class: "snb-hint" }, ["bulk water overlay (all selected)"]),
        h("div", { class: "snb-row" }, [h("label", {}, ["color"]), overlayColorSwatches(() => scene.elements[primary]?.overlayColor, (c) => idx.forEach((i) => { scene.elements[i].overlayColor = c; applyOverlayToDom(i); }))]),
        rangeRow("overlay str", () => scene.elements[primary]?.overlayStrength ?? 70, (v) => idx.forEach((i) => { scene.elements[i].overlayStrength = v; applyOverlayToDom(i); }), 0, 100, 5),
        toggleRow("hover glow", scene.elements[primary]?.hoverGlow !== false, (on) => { idx.forEach((i) => (scene.elements[i].hoverGlow = on)); renderPanel(); }),
        toggleRow("hover big", scene.elements[primary]?.hoverScale !== false, (on) => { idx.forEach((i) => (scene.elements[i].hoverScale = on)); renderPanel(); }),
        toggleRow("show label", scene.elements[primary]?.label !== false, (on) => { idx.forEach((i) => (scene.elements[i].label = on ? (scene.elements[i].alt ?? "") : false)); renderPanel(); }),
      ];
      body.append(section(`Selected — ${idx.length} selected`, true, kids));
    }

    // Export
    const copyBtn = h("button", { class: "snb-btn" }, ["Copy ::: block"]);
    copyBtn.addEventListener("click", async () => { await navigator.clipboard.writeText(serializeBlock(scene)); toast("::: block copied"); });
    body.append(section("Export", true, [copyBtn, h("div", { class: "snb-hint" }, ["Reproduces your authored grammar."])]));
  }

  renderPanel();
  wireCanvas();
  console.log("[scene-nav-builder] panel ready");
  return { close };
}
