/**
 * Scene Nav Builder — side panel UI.
 *
 * Mounts a fixed, collapsible right-hand panel over the page: scene settings, an
 * element list, a per-element property form (foldable sections), a mobile-layout
 * mode, a mockup image upload, and a "Copy ::: block" export.
 *
 * Two-way binding: dragging on the canvas updates the form; form edits update the
 * live element styles (position/scale/rotation/flip) and the scene data model.
 * Config props (glow, hover toggles, label, goto, show-on) edit the model — they
 * surface in the exported block; position is the live-preview surface.
 *
 * The Shopify embed export still exists in the code (embed-serializer.js) but is not
 * shown in this UI — bloob-haus authoring stays focused on the ::: block.
 *
 * Styles are injected from a template string (snb- prefix) so the builder bundle
 * stays a single JS file — the bundler has no CSS handling.
 */
import { serializeBlock } from "../parser.js";
import { makeDraggable } from "./drag.js";

const GLOW_PRESETS = [
  "#FF5252", "#FF8A65", "#FFD700", "#69F0AE",
  "#00E5FF", "#448AFF", "#B388FF", "#FFFFFF",
];

const CSS = `
.snb-panel{position:fixed;top:0;right:0;bottom:0;width:300px;z-index:9999;overflow-y:auto;
  background:#171223;color:#eee;font:13px/1.5 system-ui,sans-serif;box-shadow:-4px 0 24px rgba(0,0,0,.4);
  transition:transform .18s ease}
body.snb-open{padding-right:300px;transition:padding .18s ease}
body.snb-hidden{padding-right:0}
.snb-panel.snb-off{transform:translateX(300px)}
.snb-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;
  background:#120e1c;padding:10px 14px;border-bottom:1px solid #2a2140;z-index:2}
.snb-head b{font-size:12px;letter-spacing:.06em;color:#c9bdf0;text-transform:uppercase}
.snb-icon{background:#241c38;border:1px solid #3c2f5c;color:#cfc4ee;border-radius:6px;cursor:pointer;
  width:26px;height:24px;font-size:13px;line-height:1}
.snb-body{padding:6px 14px 24px}
.snb-reopen{position:fixed;top:12px;right:12px;z-index:9999;background:#5b4a8a;color:#fff;border:0;
  border-radius:6px;padding:8px 12px;cursor:pointer;font:12px system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35)}
.snb-sec{border-bottom:1px solid #241c38;padding:2px 0}
.snb-sec>summary{cursor:pointer;list-style:none;padding:9px 2px;font-size:11px;text-transform:uppercase;
  letter-spacing:.08em;color:#9d8fc4;display:flex;align-items:center;gap:6px;user-select:none}
.snb-sec>summary::-webkit-details-marker{display:none}
.snb-sec>summary::before{content:"▸";font-size:9px;color:#6b5e93;transition:transform .12s}
.snb-sec[open]>summary::before{transform:rotate(90deg)}
.snb-secbody{padding:2px 2px 12px}
.snb-row{display:flex;align-items:center;gap:6px;margin:5px 0}
.snb-row>label{flex:0 0 82px;color:#b7aed6;font-size:12px}
.snb-row input[type=text],.snb-row input[type=number],.snb-row select{flex:1;background:#241c38;
  border:1px solid #3c2f5c;color:#eee;border-radius:4px;padding:3px 6px;font-size:12px;min-width:0}
.snb-row input[type=range]{flex:1;min-width:0;accent-color:#8f7ad1}
.snb-val{flex:0 0 44px;text-align:right;color:#9d8fc4;font:11px ui-monospace,monospace}
.snb-list{list-style:none;margin:4px 0;padding:0}
.snb-list li{padding:5px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;display:flex;align-items:center;gap:7px}
.snb-list li.snb-sel{background:#3c2f5c}
.snb-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.snb-btn{display:block;width:100%;margin:6px 0;padding:8px;border:0;border-radius:5px;cursor:pointer;
  background:#5b4a8a;color:#fff;font-size:12.5px}
.snb-btn:hover{background:#6d5aa5}
.snb-btn.snb-ghost{background:transparent;border:1px dashed #3c2f5c;color:#b7aed6}
.snb-btn.snb-ghost:hover{border-color:#6d5aa5;color:#fff}
.snb-seg{display:flex;gap:4px}
.snb-seg button{flex:1;padding:5px 4px;border-radius:5px;border:1px solid #2f2547;background:transparent;
  color:#9d8fc4;cursor:pointer;font-size:11px}
.snb-seg button.snb-on{background:#2e6b4f;border-color:#3f9c72;color:#fff}
.snb-tgl{padding:3px 12px;border-radius:5px;border:1px solid #2f2547;background:transparent;color:#9d8fc4;
  cursor:pointer;font:11px ui-monospace,monospace}
.snb-tgl.snb-on{background:#2e6b4f;border-color:#3f9c72;color:#fff}
.snb-swatches{display:flex;flex-wrap:wrap;gap:5px;margin:3px 0}
.snb-sw{width:20px;height:20px;border-radius:5px;cursor:pointer;border:2px solid transparent}
.snb-sw.snb-sel{border-color:#fff;box-shadow:0 0 7px currentColor}
.snb-hint{font-size:10px;color:#6b5e93;margin:2px 0 6px}
.snb-notice{background:#3a2a10;border:1px solid #7a5a20;color:#f0c98a;border-radius:6px;padding:8px 10px;
  font-size:11px;line-height:1.4;margin:8px 0}
.snb-toast{position:fixed;bottom:16px;right:316px;background:#2e6b4f;color:#fff;padding:8px 14px;
  border-radius:6px;z-index:10000;font:13px system-ui,sans-serif}
.snb-outline{outline:2px dashed #9d8fc4;outline-offset:2px;cursor:grab}
.snb-outline.snb-sel-el{outline:2px solid #ffd700}
`;

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v != null) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) el.append(c);
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
  let collapsed = false;
  const mockups = []; // filenames added via mockup upload (not yet in the vault)
  const objectUrls = new Map(); // basename → object URL (for mockup preview)

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
  // In mobile mode, position edits write to mobileOverride; otherwise to the element.
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
    const rot = readVal(el, "rotation") || 0;
    const flip = (el.flipH ? " scaleX(-1)" : "") + (el.flipV ? " scaleY(-1)" : "");
    node.style.transform = `rotate(${rot}deg)${flip}`;
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

  // ----- mockup upload ---------------------------------------------------
  // Adds a new element from a local file — preview only. The file is NOT written to
  // the vault (that needs the webapp backend); the author must add it themselves.
  function addFromFile(file, asBackground) {
    const url = URL.createObjectURL(file);
    const name = file.name;            // basename WITH spaces (literal — encoding is a render concern)
    objectUrls.set(name, url);
    if (!mockups.includes(name)) mockups.push(name);

    if (asBackground) {
      scene.backgrounds.push({ image: name, alt: "", x: 0, y: 0, scale: 100, rotation: 0, mobileOverride: null });
    } else {
      scene.elements.push({
        type: "image", image: name, alt: name.replace(/\.[^.]+$/, ""),
        x: 50, y: 50, scale: 18, rotation: 0, resetRotationOnHover: true,
        label: false, glow: "#FFD700", glowIntensity: 1, hoverGlow: true, hoverScale: true,
        action: "link", value: null, flipH: false, flipV: false, onlyShowOn: null, mobileOverride: null,
      });
      // Inject a live DOM element so it can be dragged immediately.
      const node = h("div", { class: "scene-nav-el", style: "left:50%;top:50%;width:18%;transform:rotate(0deg);" });
      node.append(h("img", { src: url, alt: "", draggable: "false" }));
      containers.desktop.append(node);
      selected = scene.elements.length - 1;
    }
    renderPanel();
    wireCanvas();
    toast(asBackground ? "Background added (mockup)" : "Element added (mockup)");
  }

  // ----- small render helpers -------------------------------------------
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

  function slider(label, key, min, max, step) {
    const el = scene.elements[selected];
    const val = h("span", { class: "snb-val" }, [String(readVal(el, key) ?? 0)]);
    const input = h("input", {
      type: "range", min, max, step, value: readVal(el, key) ?? 0,
      oninput: (e) => {
        writeVal(el, key, Number(e.target.value));
        val.textContent = e.target.value;
        applyToDom(selected);
      },
    });
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), input, val]);
  }

  function toggleRow(label, isOn, onToggle) {
    const btn = h("button", { class: `snb-tgl${isOn ? " snb-on" : ""}` }, [isOn ? "ON" : "OFF"]);
    btn.addEventListener("click", () => onToggle(!isOn));
    return h("div", { class: "snb-row" }, [h("label", {}, [label]), h("div", { style: "flex:1" }), btn]);
  }

  function segRow(label, opts, current, onPick) {
    const seg = h("div", { class: "snb-seg" },
      opts.map((o) =>
        h("button", { class: o.value === current ? "snb-on" : "",
          onclick: () => onPick(o.value) }, [o.label])
      )
    );
    return h("div", {}, [h("div", { class: "snb-hint" }, [label]), seg]);
  }

  function section(title, open, children) {
    return h("details", { class: "snb-sec", ...(open ? { open: "" } : {}) }, [
      h("summary", {}, [title]),
      h("div", { class: "snb-secbody" }, [].concat(children)),
    ]);
  }

  function select(i) {
    selected = i;
    renderPanel();
    wireCanvas();
  }

  // ----- panel -----------------------------------------------------------
  const panel = h("aside", { class: "snb-panel" });
  document.body.append(panel);

  const reopen = h("button", { class: "snb-reopen", style: "display:none",
    onclick: () => setCollapsed(false) }, ["⚙ builder"]);
  document.body.append(reopen);

  function setCollapsed(next) {
    collapsed = next;
    panel.classList.toggle("snb-off", collapsed);
    document.body.classList.toggle("snb-hidden", collapsed);
    document.body.classList.toggle("snb-open", !collapsed);
    reopen.style.display = collapsed ? "block" : "none";
  }

  function renderPanel() {
    panel.replaceChildren();
    const el = scene.elements[selected];

    // Header with collapse control
    const head = h("div", { class: "snb-head" }, [
      h("b", {}, ["scene-nav builder"]),
      h("button", { class: "snb-icon", title: "Hide panel", onclick: () => setCollapsed(true) }, ["✕"]),
    ]);
    panel.append(head);

    const body = h("div", { class: "snb-body" });
    panel.append(body);

    // ── Scene ────────────────────────────────────────────────────────────
    const sceneRows = [
      h("div", { class: "snb-row" }, [
        h("label", {}, ["aspectRatio"]),
        h("input", { type: "text", value: scene.aspectRatio || "",
          oninput: (e) => (scene.aspectRatio = e.target.value || null) }),
      ]),
      h("div", { class: "snb-row" }, [
        h("label", {}, ["edgeFade"]),
        h("input", { type: "number", step: "0.01", value: scene.edgeFade || 0,
          oninput: (e) => (scene.edgeFade = Number(e.target.value)) }),
      ]),
    ];
    if (containers.mobile) {
      const btn = h("button", { class: `snb-btn${mobileMode ? "" : " snb-ghost"}` }, [
        mobileMode ? "editing MOBILE layout — switch to desktop" : "edit mobile layout",
      ]);
      btn.addEventListener("click", () => {
        mobileMode = !mobileMode;
        containers.desktop.style.display = mobileMode ? "none" : "block";
        containers.mobile.style.display = mobileMode ? "block" : "none";
        renderPanel();
        wireCanvas();
      });
      sceneRows.push(btn);
    }
    body.append(section("Scene", true, sceneRows));

    // ── Add (mockup upload) ───────────────────────────────────────────────
    const fileInput = h("input", { type: "file", accept: "image/*", style: "display:none" });
    const bgInput = h("input", { type: "file", accept: "image/*", style: "display:none" });
    fileInput.addEventListener("change", (e) => { if (e.target.files[0]) addFromFile(e.target.files[0], false); });
    bgInput.addEventListener("change", (e) => { if (e.target.files[0]) addFromFile(e.target.files[0], true); });
    const addChildren = [
      fileInput, bgInput,
      h("button", { class: "snb-btn snb-ghost", onclick: () => fileInput.click() }, ["＋ Add image"]),
      h("button", { class: "snb-btn snb-ghost", onclick: () => bgInput.click() }, ["＋ Add background"]),
    ];
    if (mockups.length) {
      addChildren.push(h("div", { class: "snb-notice",
        html: "⚠ <b>Mockup preview only.</b> These files are <b>not</b> saved to your vault — add them to your media folder before publishing:<br>" +
          mockups.map((m) => "• " + m).join("<br>") }));
    }
    body.append(section("Add image (mockup)", true, addChildren));

    // ── Elements list ─────────────────────────────────────────────────────
    body.append(section("Elements", true, [
      h("ul", { class: "snb-list" },
        scene.elements.map((e2, i) =>
          h("li", { class: i === selected ? "snb-sel" : "", onclick: () => select(i) }, [
            h("span", { class: "snb-dot", style: `background:${e2.glow || "#FFD700"}` }),
            h("span", { style: "overflow:hidden;text-overflow:ellipsis" },
              [e2.alt || (e2.label && e2.label !== false ? e2.label : "") || String(e2.image).split("/").pop()]),
          ])
        )
      ),
    ]));

    // ── Selected element ──────────────────────────────────────────────────
    if (el) {
      const showLabel = el.label !== false;
      const labelRows = [
        toggleRow("show label", showLabel, (on) => {
          el.label = on ? (el.alt ?? "") : false;
          renderPanel();
        }),
      ];
      if (showLabel) {
        labelRows.push(h("div", { class: "snb-row" }, [
          h("label", {}, ["label text"]),
          h("input", { type: "text",
            value: el.label === el.alt ? "" : (el.label || ""),
            placeholder: el.alt || "(alt text)",
            oninput: (e) => { el.label = e.target.value || (el.alt ?? ""); } }),
        ]));
      }

      const selChildren = [
        slider("x", "x", -50, 150, 0.1),
        slider("y", "y", -50, 150, 0.1),
        slider("scale", "scale", 2, 80, 0.5),
        slider("rotation", "rotation", -180, 180, 1),
        // flip
        h("div", { class: "snb-row" }, [
          h("label", {}, ["flip"]),
          h("div", { class: "snb-seg", style: "flex:1" }, [
            h("button", { class: el.flipH ? "snb-on" : "",
              onclick: () => { el.flipH = !el.flipH; applyToDom(selected); renderPanel(); } }, ["↔ H"]),
            h("button", { class: el.flipV ? "snb-on" : "",
              onclick: () => { el.flipV = !el.flipV; applyToDom(selected); renderPanel(); } }, ["↕ V"]),
          ]),
        ]),
        // glow
        h("div", { class: "snb-hint" }, ["glow color"]),
        h("div", { class: "snb-swatches" },
          GLOW_PRESETS.map((c) =>
            h("div", { class: `snb-sw${el.glow === c ? " snb-sel" : ""}`,
              style: `background:${c};color:${c}`, title: c,
              onclick: () => { el.glow = c; renderPanel(); } })
          ).concat([
            h("input", { type: "color", value: el.glow || "#FFD700",
              style: "width:24px;height:22px;padding:1px;background:transparent;border:1px solid #3c2f5c;border-radius:4px;cursor:pointer",
              oninput: (e) => { el.glow = e.target.value; renderPanel(); } }),
          ])
        ),
        slider("glowIntensity", "glowIntensity", 0.2, 3, 0.1),
        toggleRow("hover glow", el.hoverGlow !== false, (on) => { el.hoverGlow = on; renderPanel(); }),
        toggleRow("hover enlarge", el.hoverScale !== false, (on) => { el.hoverScale = on; renderPanel(); }),
        ...labelRows,
        // goto
        h("div", { class: "snb-row" }, [
          h("label", {}, ["goto"]),
          h("input", { type: "text", value: el.value || "",
            placeholder: "note.md, /url/, or #anchor",
            oninput: (e) => { el.value = e.target.value; el.action = e.target.value.startsWith("#") ? "anchor" : "link"; } }),
        ]),
      ];
      if (containers.mobile) {
        selChildren.push(segRow("show on", [
          { value: null, label: "Both" },
          { value: "desktop", label: "Desktop" },
          { value: "mobile", label: "Mobile" },
        ], el.onlyShowOn ? el.onlyShowOn[0] : null, (v) => {
          el.onlyShowOn = v ? [v] : null;
          renderPanel();
        }));
      }
      selChildren.push(h("button", { class: "snb-btn snb-ghost",
        onclick: () => {
          const node = domEls()[selected];
          if (node) node.remove();
          scene.elements.splice(selected, 1);
          selected = Math.max(0, selected - 1);
          renderPanel(); wireCanvas();
        } }, ["Remove element"]));

      body.append(section(mobileMode ? "Selected (mobile layout)" : "Selected element", true, selChildren));
    }

    // ── Background layers ─────────────────────────────────────────────────
    if (scene.backgrounds && scene.backgrounds.length) {
      const bgChildren = [];
      scene.backgrounds.forEach((bg, i) => {
        bgChildren.push(h("div", { class: "snb-hint" }, [String(bg.image).split("/").pop()]));
        ["scale", "x", "y", "rotation"].forEach((k) => {
          const val = h("span", { class: "snb-val" }, [String(bg[k] ?? 0)]);
          const ranges = { scale: [10, 200, 1], x: [-100, 200, 0.5], y: [-100, 200, 0.5], rotation: [-180, 180, 1] };
          const [mn, mx, st] = ranges[k];
          bgChildren.push(h("div", { class: "snb-row" }, [
            h("label", {}, [k]),
            h("input", { type: "range", min: mn, max: mx, step: st, value: bg[k] ?? 0,
              oninput: (e) => { bg[k] = Number(e.target.value); val.textContent = e.target.value; } }),
            val,
          ]));
        });
      });
      body.append(section("Background layers", false, bgChildren));
    }

    // ── Export ────────────────────────────────────────────────────────────
    const copyBlock = h("button", { class: "snb-btn" }, ["Copy ::: block"]);
    copyBlock.addEventListener("click", async () => {
      await navigator.clipboard.writeText(serializeBlock(scene));
      toast("::: block copied — paste into Obsidian");
    });
    body.append(section("Export", true, [
      copyBlock,
      h("div", { class: "snb-hint" }, ["Copies the scene-nav block in your authored grammar."]),
    ]));
  }

  renderPanel();
  wireCanvas();
  console.log("[scene-nav-builder] ready — drag to position, Shift+drag to scale");
}
