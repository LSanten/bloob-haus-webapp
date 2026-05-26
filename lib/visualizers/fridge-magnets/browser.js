/**
 * Fridge Magnets Visualizer — Runtime
 *
 * Mounts interactive magnet boards into each .fridge-magnets-visualizer div.
 * Features: drag, lasso-select, add-word, editor toggle, submission modal,
 * display-feedback mode with 60s silent refresh.
 */

import {
  parseInput,
  countWords,
  buildArrangement,
  buildSelectionArrangement,
  buildPreviewCards,
  parseCSV,
  passesModeration,
  escapeHtml,
} from "./utils.js";

/* ─── State ─────────────────────────────────────────────────────────────── */

let canvasIdCounter = 0;
let cardIdCounter = 0;
const canvases = [];

let drag = null;
let lasso = null;
let pendingSubmit = null; // { canvasId, mode, config }

/* ─── Canvas factory ─────────────────────────────────────────────────────── */

/**
 * Creates a canvas and appends (or inserts before) it into `root`.
 * opts: { height, showEditor, feedbackConfig, scrollIntoView }
 * feedbackConfig: { board, gformUrl, fields: { arrangement, board, type, name, category } }
 */
function createCanvas(root, insertBefore = null, preloadText = "", opts = {}) {
  const id = ++canvasIdCounter;
  const {
    height = 280,
    showEditor = false,
    feedbackConfig = null,
    scrollIntoView = false,
  } = opts;

  const canvas = {
    id,
    cards: [],
    inputText: preloadText,
    feedbackConfig,
    initialHeight: height,
    wrapper: null, // set after wrapper is created
    modified: false, // true once user moves or adds a card
  };
  canvases.push(canvas);

  const wrapper = document.createElement("div");
  wrapper.className = "fm-canvas-wrapper";
  wrapper.id = `fm-cw-${id}`;

  wrapper.innerHTML = `
    <div class="fm-canvas-header">
      <span class="fm-canvas-stats" id="fm-stats-${id}">0 words · 0 cards</span>
      <button class="fm-clear-btn" title="Clear canvas">Clear</button>
    </div>
    <div class="fm-canvas-area" id="fm-area-${id}" style="min-height:${height}px"></div>
    ${
      feedbackConfig
        ? `<div class="fm-feedback-bar" id="fm-fb-${id}">
        <button class="fm-submit-btn" id="fm-submit-board-${id}" style="display:none">Submit this board</button>
        <button class="fm-submit-btn" id="fm-submit-sel-${id}" style="display:none">Submit selection (0)</button>
      </div>`
        : ""
    }
    <div class="fm-canvas-bottom">
      <div class="fm-add-word-wrap">
        <input class="fm-add-word-input" id="fm-aw-inp-${id}" type="text"
               placeholder="add a word…" maxlength="30" />
        <button class="fm-add-word-btn" id="fm-aw-btn-${id}">+ Add</button>
      </div>
      <button class="fm-editor-toggle" id="fm-editor-toggle-${id}" title="Show YAML editor">&lt; &gt;</button>
    </div>
    <div class="fm-editor-panel" id="fm-editor-panel-${id}" style="display:${showEditor ? "block" : "none"}">
      <div class="fm-input-row">
        <textarea id="fm-inp-${id}" placeholder="[Your] [words] [here] — wrap each card in brackets" spellcheck="false">${preloadText}</textarea>
        <button class="fm-load-btn">Load →</button>
      </div>
      <div class="fm-editor-copy-row">
        <button class="fm-copy-btn" title="Copy card text as [bracket] string">Copy</button>
        <button class="fm-copy-layout-btn" title="Copy with positions: [text](x,y)">Copy Layout</button>
      </div>
      <div class="fm-input-hint">
        <span><b>Drag</b> to rearrange · <b>Click</b> to select · <b>Lasso</b> on empty space to group-select · <b>Dbl-click</b> to solo-select</span>
      </div>
    </div>
  `;

  canvas.wrapper = wrapper; // keep reference for out-of-document queries

  if (insertBefore) {
    root.insertBefore(wrapper, insertBefore);
  } else {
    root.appendChild(wrapper);
  }

  // ── Load button
  wrapper.querySelector(".fm-load-btn").addEventListener("click", () => {
    const text = wrapper.querySelector(`#fm-inp-${id}`).value;
    canvas.inputText = text;
    loadCards(id);
  });

  // ── Copy buttons
  wrapper
    .querySelector(".fm-copy-btn")
    .addEventListener("click", () => copyCanvas(id, false));
  wrapper
    .querySelector(".fm-copy-layout-btn")
    .addEventListener("click", () => copyCanvas(id, true));

  // ── Clear button
  wrapper.querySelector(".fm-clear-btn").addEventListener("click", () => {
    const area = document.getElementById(`fm-area-${id}`);
    area.innerHTML = "";
    canvas.cards = [];
    updateStats(id);
    syncFeedbackBar(id);
  });

  // ── Lasso on canvas area (mousedown on empty space)
  const area = document.getElementById(`fm-area-${id}`)
    || wrapper.querySelector(`#fm-area-${id}`);
  area.addEventListener("mousedown", (e) => {
    if (e.target !== area) return;
    deselectAll(id);
    const rect = area.getBoundingClientRect();
    const x0 = e.clientX - rect.left + area.scrollLeft;
    const y0 = e.clientY - rect.top + area.scrollTop;
    const el = document.createElement("div");
    el.className = "fm-lasso";
    el.style.cssText = `left:${x0}px;top:${y0}px;width:0;height:0`;
    area.appendChild(el);
    lasso = { canvasId: id, el, x0, y0 };
  });

  // ── Editor toggle
  const editorToggle = wrapper.querySelector(`#fm-editor-toggle-${id}`);
  const editorPanel = wrapper.querySelector(`#fm-editor-panel-${id}`);
  editorToggle.addEventListener("click", () => {
    const visible = editorPanel.style.display !== "none";
    editorPanel.style.display = visible ? "none" : "block";
    editorToggle.title = visible ? "Show YAML editor" : "Hide YAML editor";
    editorToggle.innerHTML = visible ? "&lt; &gt;" : "&lt;/&gt;";
  });

  // ── Add-a-word
  const awInput = wrapper.querySelector(`#fm-aw-inp-${id}`);
  const awBtn = wrapper.querySelector(`#fm-aw-btn-${id}`);
  function doAddWord() {
    const text = awInput.value.trim();
    if (!text) return;
    addWordToCanvas(id, text);
    awInput.value = "";
    awInput.focus();
  }
  awBtn.addEventListener("click", doAddWord);
  awInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doAddWord();
    }
  });

  // ── Feedback bar buttons
  if (feedbackConfig) {
    wrapper
      .querySelector(`#fm-submit-board-${id}`)
      .addEventListener("click", () => openModal(id, "board", feedbackConfig));
    wrapper
      .querySelector(`#fm-submit-sel-${id}`)
      .addEventListener("click", () =>
        openModal(id, "selection", feedbackConfig),
      );
  }

  // ── Pre-load cards from YAML data
  if (preloadText) loadCards(id, height);

  if (scrollIntoView) {
    setTimeout(
      () => wrapper.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  }

  return wrapper;
}

/* ─── Load / layout cards ────────────────────────────────────────────────── */

function loadCards(canvasId, initialHeight) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas) return;

  const h = initialHeight || canvas.initialHeight || 280;
  const inp = document.getElementById(`fm-inp-${canvasId}`)
    || canvas.wrapper?.querySelector(`#fm-inp-${canvasId}`);
  const text = inp ? inp.value : canvas.inputText;
  const parsed = parseInput(text);
  const area = document.getElementById(`fm-area-${canvasId}`)
    || canvas.wrapper?.querySelector(`#fm-area-${canvasId}`);

  area.innerHTML = "";
  canvas.cards = [];

  const hasPositions = parsed.some((p) => p.x !== null && p.y !== null);

  parsed.forEach((p) => {
    // Cards starting with '+' are user-added custom cards
    const isCustom = p.text.startsWith("+");
    const card = {
      id: ++cardIdCounter,
      text: isCustom ? p.text.slice(1) : p.text,
      x: p.x !== null ? p.x : 0,
      y: p.y !== null ? p.y : 0,
      hasPosition: p.x !== null && p.y !== null,
      selected: false,
      canvasId,
      custom: isCustom,
    };
    canvas.cards.push(card);
    area.appendChild(makeCardEl(card, canvasId));
  });

  requestAnimationFrame(() => {
    if (hasPositions) {
      positionCards(area, canvas.cards, h);
    } else {
      layoutCards(area, canvas.cards, h);
    }
    scaleCanvasToViewport(area, canvas.cards);
    updateStats(canvasId);
    syncFeedbackBar(canvasId);
  });
}

function positionCards(area, cards, initialHeight = 280) {
  cards.forEach((card) => {
    const el = area.querySelector(`[data-cid="${card.id}"]`);
    if (!el) return;
    el.style.left = card.x + "px";
    el.style.top = card.y + "px";
    el.style.visibility = "visible";
  });
  expandArea(area, cards, initialHeight);
}

function layoutCards(area, cards, initialHeight = 280) {
  const GAP = 8;
  const ROW_H = 38;
  const MARGIN = 10;
  const availW = area.clientWidth - MARGIN * 2;
  let x = MARGIN;
  let y = MARGIN;

  cards.forEach((card) => {
    const el = area.querySelector(`[data-cid="${card.id}"]`);
    if (!el) return;
    const w = el.offsetWidth;
    if (x + w > availW + MARGIN && x > MARGIN) {
      x = MARGIN;
      y += ROW_H + GAP;
    }
    card.x = x;
    card.y = y;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.visibility = "visible";
    x += w + GAP;
  });

  expandArea(area, cards, initialHeight);
}

function expandArea(area, cards, initialHeight = 280) {
  if (!cards.length) {
    area.style.minHeight = initialHeight + "px";
    return;
  }
  const maxY = Math.max(...cards.map((c) => c.y)) + 38 + 20;
  area.style.minHeight = Math.max(initialHeight, maxY) + "px";
}

function scaleCanvasToViewport(area, cards) {
  // Only act on narrow viewports
  if ((window.innerWidth || 9999) >= 640) return;
  if (!cards || !cards.length) return;

  const vw =
    (window.innerWidth || document.documentElement.clientWidth) - 20;

  // Measure actual content width from card right edges (scrollWidth lies when overflow:hidden)
  let maxRight = 0;
  cards.forEach((c) => {
    const el = area.querySelector(`[data-cid="${c.id}"]`);
    maxRight = Math.max(maxRight, c.x + (el ? el.offsetWidth : 80));
  });

  if (maxRight <= vw) {
    area.style.width = "";
    area.style.zoom = "";
    return;
  }

  const desiredScale = vw / maxRight;

  if (desiredScale >= 0.32) {
    // Zoom to fit — text shrinks proportionally but stays readable
    area.style.width = maxRight + "px";
    area.style.zoom = String(desiredScale);
  } else {
    // Too wide to scale readably — make the wrapper scrollable instead
    area.style.width = maxRight + "px";
    area.style.zoom = "";
    area.style.overflow = "visible"; // allow cards to paint past width so scroll works
    const wrapper = area.closest(".fm-canvas-wrapper");
    if (wrapper) wrapper.style.overflowX = "auto";
  }
}

/* ─── Card element factory ───────────────────────────────────────────────── */

function makeCardEl(card, canvasId) {
  const el = document.createElement("div");
  el.className = "fm-card" + (card.custom ? " fm-card--custom" : "");
  el.dataset.cid = card.id;
  el.textContent = card.text;

  el.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const canvas = canvases.find((c) => c.id === canvasId);
    if (!canvas) return;

    const wasSelected = card.selected;
    if (!wasSelected) setSelected(card, el, true);

    const sel = canvas.cards.filter((c) => c.selected);
    drag = {
      canvasId,
      cards: sel.map((c) => ({ card: c, startX: c.x, startY: c.y })),
      mx0: e.clientX,
      my0: e.clientY,
      moved: false,
      clickedWasSelected: wasSelected,
      clickedCard: card,
      clickedEl: el,
    };

    sel.forEach((c) => {
      const el2 = getCardEl(canvasId, c.id);
      if (el2) el2.classList.add("fm-dragging");
    });
  });

  el.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    const canvas = canvases.find((c) => c.id === canvasId);
    if (!canvas) return;
    deselectAll(canvasId);
    setSelected(card, el, true);
  });

  return el;
}

/* ─── Add-a-word ─────────────────────────────────────────────────────────── */

function addWordToCanvas(canvasId, text) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas) return;
  const area = document.getElementById(`fm-area-${canvasId}`);
  if (!area) return;

  // Place below all existing cards, left-aligned
  const maxY =
    canvas.cards.length > 0
      ? Math.max(...canvas.cards.map((c) => c.y)) + 50
      : 10;

  const card = {
    id: ++cardIdCounter,
    text,
    x: 10,
    y: maxY,
    hasPosition: true,
    selected: false,
    canvasId,
    custom: true,
  };

  canvas.cards.push(card);
  const el = makeCardEl(card, canvasId);
  el.style.left = card.x + "px";
  el.style.top = card.y + "px";
  el.style.visibility = "visible";
  area.appendChild(el);

  expandArea(area, canvas.cards, canvas.initialHeight);
  updateStats(canvasId);
  if (!canvas.modified) {
    canvas.modified = true;
    syncFeedbackBar(canvasId);
  }
}

/* ─── Selection helpers ──────────────────────────────────────────────────── */

function setSelected(card, el, val) {
  card.selected = val;
  el.classList.toggle("fm-selected", val);
  syncFeedbackBar(card.canvasId);
}

function deselectAll(canvasId) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas) return;
  canvas.cards.forEach((card) => {
    const el = getCardEl(canvasId, card.id);
    if (el) setSelected(card, el, false);
  });
}

function getCardEl(canvasId, cardId) {
  const area = document.getElementById(`fm-area-${canvasId}`);
  return area ? area.querySelector(`[data-cid="${cardId}"]`) : null;
}

/* ─── Feedback bar sync ──────────────────────────────────────────────────── */

function showWithPop(btn) {
  btn.style.display = "";
  btn.classList.remove("fm-pop");
  void btn.offsetWidth; // force reflow to restart animation
  btn.classList.add("fm-pop");
}

function syncFeedbackBar(canvasId) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas || !canvas.feedbackConfig) return;
  const w = canvas.wrapper;
  const selBtn =
    document.getElementById(`fm-submit-sel-${canvasId}`) ||
    w?.querySelector(`#fm-submit-sel-${canvasId}`);
  const boardBtn =
    document.getElementById(`fm-submit-board-${canvasId}`) ||
    w?.querySelector(`#fm-submit-board-${canvasId}`);

  // Board button: show only after user has moved or added a card
  if (boardBtn) {
    if (canvas.modified && boardBtn.style.display === "none") {
      showWithPop(boardBtn);
    } else if (!canvas.modified) {
      boardBtn.style.display = "none";
    }
  }

  if (!selBtn) return;
  const count = canvas.cards.filter((c) => c.selected).length;
  if (count >= 2) {
    const wasHidden = selBtn.style.display === "none";
    selBtn.textContent = `Submit selection (${count})`;
    if (wasHidden) showWithPop(selBtn);
    else selBtn.style.display = "";
  } else {
    selBtn.style.display = "none";
  }
}

/* ─── Stats & Copy ───────────────────────────────────────────────────────── */

function updateStats(canvasId) {
  const canvas = canvases.find((c) => c.id === canvasId);
  const el = document.getElementById(`fm-stats-${canvasId}`);
  if (!canvas || !el) return;
  const texts = canvas.cards.map((c) => c.text);
  const words = countWords(texts);
  el.textContent = `${words} word${words !== 1 ? "s" : ""} · ${texts.length} card${texts.length !== 1 ? "s" : ""}`;
}

function copyCanvas(canvasId, withLayout = false) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas || !canvas.cards.length) return;

  const sorted = [...canvas.cards].sort((a, b) => {
    const rowDiff = Math.floor(a.y / 48) - Math.floor(b.y / 48);
    return rowDiff !== 0 ? rowDiff : a.x - b.x;
  });

  const text = withLayout
    ? sorted
        .map((c) => {
          const label = c.custom ? `+${c.text}` : c.text;
          return `[${label}](${Math.round(c.x)},${Math.round(c.y)})`;
        })
        .join(" ")
    : sorted.map((c) => `[${c.text}]`).join(" ");

  const btnClass = withLayout ? ".fm-copy-layout-btn" : ".fm-copy-btn";
  const btnLabel = withLayout ? "Copy Layout" : "Copy";

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`#fm-cw-${canvasId} ${btnClass}`);
    if (!btn) return;
    btn.textContent = "Copied ✓";
    btn.classList.add("fm-copied");
    setTimeout(() => {
      btn.textContent = btnLabel;
      btn.classList.remove("fm-copied");
    }, 1600);
  });
}

/* ─── Submission modal ───────────────────────────────────────────────────── */

function buildModal() {
  const overlay = document.createElement("div");
  overlay.className = "fm-modal-overlay";
  overlay.id = "fm-modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  overlay.innerHTML = `
    <div class="fm-modal">
      <button class="fm-modal-close" aria-label="Close">×</button>
      <p class="fm-modal-remix-note" id="fm-modal-remix-note" style="display:none"></p>
      <p class="fm-modal-preview-label">You're submitting:</p>
      <div class="fm-modal-board-preview" id="fm-modal-preview"></div>
      <div class="fm-modal-field">
        <label class="fm-modal-label">What best describes this?</label>
        <select class="fm-modal-category" id="fm-modal-cat">
          <option value="">— choose —</option>
          <option value="😂 Funny">😂 Funny</option>
          <option value="🧠 Informative">🧠 Informative</option>
          <option value="_other">✏️ Other…</option>
        </select>
        <input class="fm-modal-cat-text" id="fm-modal-cat-text" type="text"
               placeholder="describe it…" style="display:none" />
      </div>
      <div class="fm-modal-field" id="fm-modal-name-field">
        <label class="fm-modal-label">
          Your name <span class="fm-optional">(optional)</span>
        </label>
        <input class="fm-modal-name" id="fm-modal-name" type="text" placeholder="Your name" />
      </div>
      <div class="fm-modal-field" id="fm-modal-comment-field">
        <label class="fm-modal-label">
          Comment <span class="fm-optional">(optional)</span>
        </label>
        <textarea class="fm-modal-comment" id="fm-modal-comment" rows="2"
                  placeholder="Say something about this arrangement…"></textarea>
      </div>
      <div class="fm-modal-actions">
        <button class="fm-modal-submit-btn" id="fm-modal-submit">Submit ↗</button>
        <button class="fm-modal-cancel-btn" id="fm-modal-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("fm-open"))
      closeModal();
  });
  overlay
    .querySelector("#fm-modal-cancel")
    .addEventListener("click", closeModal);
  overlay
    .querySelector(".fm-modal-close")
    .addEventListener("click", closeModal);

  overlay.querySelector("#fm-modal-cat").addEventListener("change", (e) => {
    const catText = overlay.querySelector("#fm-modal-cat-text");
    catText.style.display = e.target.value === "_other" ? "block" : "none";
    if (e.target.value === "_other") catText.focus();
  });

  overlay
    .querySelector("#fm-modal-submit")
    .addEventListener("click", submitArrangement);
}

function openModal(canvasId, mode, config) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas) return;

  pendingSubmit = { canvasId, mode, config };

  // Populate preview board
  const previewEl = document.getElementById("fm-modal-preview");
  previewEl.innerHTML = "";
  previewEl.style.cssText = "";

  const sourcecards =
    mode === "selection"
      ? canvas.cards.filter((c) => c.selected)
      : canvas.cards;

  if (sourcecards.length) {
    const previews = buildPreviewCards(sourcecards);
    const naturalW = Math.max(...previews.map((c) => c.x)) + 120;
    const naturalH = Math.max(...previews.map((c) => c.y)) + 50;

    const inner = document.createElement("div");
    inner.style.cssText = `position:relative;width:${naturalW}px;height:${naturalH}px;transform-origin:top left`;

    previews.forEach((c) => {
      const el = document.createElement("div");
      el.className = "fm-card" + (c.custom ? " fm-card--custom" : "");
      el.style.cssText = `left:${c.x}px;top:${c.y}px;visibility:visible;font-size:12px`;
      el.textContent = c.text;
      inner.appendChild(el);
    });

    previewEl.appendChild(inner);

    // Scale down to fit container if cards are wider than available space
    const containerW = previewEl.clientWidth || 400;
    const scale = Math.min(1, containerW / naturalW);
    inner.style.transform = `scale(${scale})`;
    previewEl.style.height = Math.round(naturalH * scale) + "px";
  }

  // Show/hide name field
  const nameField = document.getElementById("fm-modal-name-field");
  nameField.style.display = config.fields.name ? "" : "none";

  // Pre-fill name from localStorage
  const nameInput = document.getElementById("fm-modal-name");
  nameInput.value = localStorage.getItem("fm-submitter-name") || "";

  // Show remix attribution if re-submitting from a community board
  const remixNote = document.getElementById("fm-modal-remix-note");
  if (remixNote) {
    if (config.originalAuthor) {
      remixNote.textContent = `Remixing ${config.originalAuthor}'s arrangement`;
      remixNote.style.display = "";
    } else {
      remixNote.style.display = "none";
    }
  }

  // Reset category
  document.getElementById("fm-modal-cat").value = "";
  const catText = document.getElementById("fm-modal-cat-text");
  catText.style.display = "none";
  catText.value = "";

  // Reset comment
  const commentEl = document.getElementById("fm-modal-comment");
  if (commentEl) commentEl.value = "";

  // Show/hide comment field
  const commentField = document.getElementById("fm-modal-comment-field");
  if (commentField) commentField.style.display = config.fields.comment ? "" : "none";

  const overlay = document.getElementById("fm-modal-overlay");
  overlay.classList.add("fm-open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const overlay = document.getElementById("fm-modal-overlay");
  if (overlay) overlay.classList.remove("fm-open");
  document.body.style.overflow = "";
  pendingSubmit = null;
}

function submitArrangement() {
  if (!pendingSubmit) return;
  const { canvasId, mode, config } = pendingSubmit;
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas) return;

  const catSelect = document.getElementById("fm-modal-cat");
  const catText = document.getElementById("fm-modal-cat-text");
  const nameInput = document.getElementById("fm-modal-name");

  const category =
    catSelect.value === "_other"
      ? catText.value.trim()
      : catSelect.value;

  const name = nameInput.value.trim();
  if (name) {
    localStorage.setItem("fm-submitter-name", name);
    syncNameInputs(name);
  }

  const commentInput = document.getElementById("fm-modal-comment");
  const comment = commentInput ? commentInput.value.trim() : "";

  const arrangement =
    mode === "selection"
      ? buildSelectionArrangement(canvas.cards)
      : buildArrangement(canvas.cards);

  // Encode original author attribution when re-submitting a community board
  const submittedName =
    config.originalAuthor && name
      ? `${name} ↺ ${config.originalAuthor}`
      : name;

  const fields = {};
  if (config.fields.arrangement)
    fields[config.fields.arrangement] = arrangement;
  if (config.fields.board) fields[config.fields.board] = config.board;
  if (config.fields.type)
    fields[config.fields.type] =
      mode === "selection" ? "selection" : "whole-board";
  if (config.fields.name && submittedName)
    fields[config.fields.name] = submittedName;
  if (config.fields.category && category)
    fields[config.fields.category] = category;
  if (config.fields.comment && comment)
    fields[config.fields.comment] = comment;

  fetch(config.gformUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  }).catch(() => {}); // no-cors always rejects — fire and forget

  closeModal();
  showToast("Thanks! Scroll down to see it appear 👇");
  setTimeout(
    () => document.dispatchEvent(new CustomEvent("fm:refresh-display")),
    5000,
  );
}

function showToast(msg) {
  let toast = document.getElementById("fm-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "fm-toast";
    toast.className = "fm-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("fm-visible");
  setTimeout(() => toast.classList.remove("fm-visible"), 4000);
}

function syncNameInputs(name) {
  if (!name) return;
  document.querySelectorAll(".fm-comment-name-input").forEach((el) => {
    el.value = name;
  });
}

/* ─── Display-feedback mode ──────────────────────────────────────────────── */

function submitInteraction(targetKey, type, name, comment, formConfig) {
  if (!formConfig || !formConfig.gformUrl) return;
  const fields = {};
  if (formConfig.fields.arrangement) fields[formConfig.fields.arrangement] = targetKey;
  if (formConfig.fields.type) fields[formConfig.fields.type] = type;
  if (formConfig.fields.name && name) fields[formConfig.fields.name] = name;
  if (formConfig.fields.comment && comment) fields[formConfig.fields.comment] = comment;
  fetch(formConfig.gformUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  }).catch(() => {});
}

function formatCatBadge(cat) {
  if (!cat) return "";
  // If first char is non-ASCII (emoji), assume it already has one
  const hasEmoji = cat.charCodeAt(0) > 127;
  const display = hasEmoji ? cat : `✨ ${cat}`;
  return `<span class="fm-cat-badge">${escapeHtml(display)}</span>`;
}

function makeCommentEl(reply) {
  const el = document.createElement("div");
  el.className = "fm-comment";
  if (reply.Timestamp) el.dataset.commentKey = reply.Timestamp;
  const nameEl = document.createElement("span");
  nameEl.className = "fm-comment-name";
  nameEl.textContent = reply.name || "anonymous";
  const textEl = document.createElement("span");
  textEl.className = "fm-comment-text";
  textEl.textContent = reply.comment || "";
  el.appendChild(nameEl);
  el.appendChild(textEl);
  return el;
}

function renderInteractionFooter(row, likes, replies, formConfig) {
  const targetKey = row.Timestamp;
  const footer = document.createElement("div");
  footer.className = "fm-interaction-footer";
  footer.dataset.submissionKey = targetKey;

  const header = document.createElement("div");
  header.className = "fm-interaction-header";
  header.textContent = "Like & Comment";
  footer.appendChild(header);

  // ── Like bar
  const likeBar = document.createElement("div");
  likeBar.className = "fm-like-bar";

  const likeKey = `fm-liked-${encodeURIComponent(targetKey)}`;
  const alreadyLiked = localStorage.getItem(likeKey) === "true";

  const likeBtn = document.createElement("button");
  likeBtn.className = "fm-like-btn" + (alreadyLiked ? " fm-liked" : "");
  likeBtn.dataset.key = targetKey;

  const likeIcon = document.createElement("span");
  likeIcon.className = "fm-like-icon";
  likeIcon.textContent = alreadyLiked ? "❤" : "♡";

  const likeCount = document.createElement("span");
  likeCount.className = "fm-like-count";
  likeCount.textContent = likes.length;

  likeBtn.appendChild(likeIcon);
  likeBtn.appendChild(document.createTextNode(" "));
  likeBtn.appendChild(likeCount);

  if (!alreadyLiked && formConfig) {
    likeBtn.addEventListener("click", () => {
      localStorage.setItem(likeKey, "true");
      likeBtn.classList.add("fm-liked");
      likeIcon.textContent = "❤";
      likeCount.textContent = parseInt(likeCount.textContent) + 1;
      submitInteraction(targetKey, "like", "", "", formConfig);
    });
  } else {
    likeBtn.disabled = !alreadyLiked && !formConfig;
  }

  likeBar.appendChild(likeBtn);
  footer.appendChild(likeBar);

  // ── Comments section
  const commentsSection = document.createElement("div");
  commentsSection.className = "fm-comments-section";

  const commentsList = document.createElement("div");
  commentsList.className = "fm-comments-list";
  replies.forEach((r) => commentsList.appendChild(makeCommentEl(r)));
  commentsSection.appendChild(commentsList);

  if (formConfig) {
    const inputArea = document.createElement("div");
    inputArea.className = "fm-comment-input-area";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "fm-comment-name-input";
    nameInput.placeholder = "Your name";
    nameInput.value = localStorage.getItem("fm-submitter-name") || "";

    const textarea = document.createElement("textarea");
    textarea.className = "fm-comment-textarea";
    textarea.rows = 2;
    textarea.placeholder = "Add a comment on this arrangement…";

    const submitBtn = document.createElement("button");
    submitBtn.className = "fm-comment-submit-btn";
    submitBtn.textContent = "Reply ↗";

    submitBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const text = textarea.value.trim();
      if (!text) return;
      if (name) {
        localStorage.setItem("fm-submitter-name", name);
        syncNameInputs(name);
      }
      commentsList.appendChild(makeCommentEl({ name, comment: text }));
      textarea.value = "";
      submitInteraction(targetKey, "comment_reply", name, text, formConfig);
    });

    inputArea.appendChild(nameInput);
    inputArea.appendChild(textarea);
    inputArea.appendChild(submitBtn);
    commentsSection.appendChild(inputArea);
  }

  footer.appendChild(commentsSection);
  return footer;
}

function updateInteractions(key, likes, replies, container) {
  const footer = container.querySelector(
    `.fm-interaction-footer[data-submission-key="${CSS.escape(key)}"]`,
  );
  if (!footer) return;

  // Update like count
  const likeCount = footer.querySelector(".fm-like-count");
  if (likeCount) likeCount.textContent = likes.length;

  // Append new comments not yet in DOM
  const commentsList = footer.querySelector(".fm-comments-list");
  if (commentsList) {
    const existing = new Set(
      [...commentsList.querySelectorAll("[data-comment-key]")].map(
        (el) => el.dataset.commentKey,
      ),
    );
    replies.forEach((r) => {
      if (r.Timestamp && existing.has(r.Timestamp)) return;
      commentsList.appendChild(makeCommentEl(r));
    });
  }
}

function mountDisplayFeedback(host) {
  const csvUrl = host.dataset.gsheetCsv;
  const modHours = parseFloat(host.dataset.moderationHours) || 24;
  const debugMode = host.dataset.debug === "true";
  if (!csvUrl) return;

  const formConfig = host.dataset.gformUrl
    ? {
        gformUrl: host.dataset.gformUrl,
        fields: {
          arrangement: host.dataset.fieldArrangement || "",
          type: host.dataset.fieldType || "",
          name: host.dataset.fieldName || "",
          comment: host.dataset.fieldComment || "",
        },
      }
    : null;

  const feedbackAllow = host.dataset.feedbackAllow === "true";
  let boardNameForResubmit = host.dataset.board || "";

  const container = document.createElement("div");
  container.className = "fm-display-root";
  host.replaceWith(container);

  // ── Debug log panel (only when debug: yes in YAML)
  let logEl = null;
  function dbg(msg, data) {
    const line =
      data !== undefined ? `${msg}: ${JSON.stringify(data, null, 0)}` : msg;
    console.log("[fm-display]", line);
    if (!debugMode) return;
    if (!logEl) {
      logEl = document.createElement("div");
      logEl.className = "fm-debug-log";
      logEl.innerHTML = `<strong>🐛 fridge-magnets debug log</strong>`;
      container.appendChild(logEl);
    }
    const entry = document.createElement("div");
    entry.className = "fm-debug-entry";
    entry.textContent = line;
    logEl.appendChild(entry);
  }

  const rendered = new Set();
  let emptyNotice = null;
  const PRIMARY_TYPES = new Set(["whole-board", "selection"]);

  const spinner = document.createElement("div");
  spinner.className = "fm-display-spinner";
  spinner.innerHTML = `<span class="fm-spinner-ring"></span><span class="fm-spinner-label">Loading new submissions…</span>`;
  spinner.style.display = "none";
  container.appendChild(spinner);

  function showSpinner() {
    spinner.style.display = "flex";
    if (emptyNotice) {
      emptyNotice.remove();
      emptyNotice = null;
    }
  }
  function hideSpinner() {
    spinner.style.display = "none";
  }

  async function fetchAndRender() {
    dbg("fetch start", csvUrl);
    let text;
    try {
      const resp = await fetch(csvUrl);
      dbg("fetch status", resp.status);
      text = await resp.text();
      dbg("csv length (chars)", text.length);
    } catch (err) {
      dbg("fetch ERROR", String(err));
      hideSpinner();
      return;
    }

    const allRows = parseCSV(text);
    dbg("total CSV rows", allRows.length);

    const primaryRows = allRows
      .filter((r) => {
        if (!PRIMARY_TYPES.has(r.type)) return false;
        const pass = passesModeration(r, modHours);
        dbg(
          `row type=${r.type} ts=${r.Timestamp} approved=${r.approved} → moderation`,
          pass,
        );
        return pass;
      })
      .sort((a, b) =>
        a.type === b.type ? 0 : a.type === "selection" ? -1 : 1,
      );

    const likeRows = allRows.filter((r) => r.type === "like");
    const replyRows = allRows.filter((r) => r.type === "comment_reply");

    dbg("primary rows", primaryRows.length);
    dbg("likes", likeRows.length);
    dbg("replies", replyRows.length);

    // Resolve board name for re-submissions from the first row if not set in YAML
    if (feedbackAllow && !boardNameForResubmit && primaryRows.length > 0) {
      boardNameForResubmit = primaryRows[0].board || "";
    }

    if (primaryRows.length === 0 && rendered.size === 0) {
      hideSpinner();
      if (!emptyNotice) {
        emptyNotice = document.createElement("p");
        emptyNotice.className = "fm-display-empty";
        emptyNotice.textContent =
          "No arrangements submitted yet — be the first!";
        container.insertBefore(emptyNotice, spinner);
      }
      return;
    }

    if (emptyNotice) {
      emptyNotice.remove();
      emptyNotice = null;
    }

    primaryRows.forEach((row) => {
      const key = row.Timestamp || row.submitted_at;
      if (!key) return;

      const rowLikes = likeRows.filter((l) => l.arrangement === key);
      const rowReplies = replyRows.filter((r) => r.arrangement === key);

      if (rendered.has(key)) {
        dbg("updating interactions", key);
        updateInteractions(key, rowLikes, rowReplies, container);
        return;
      }

      rendered.add(key);
      dbg("rendering row", { type: row.type, key });
      let el;
      try {
        const rowResubmitConfig =
          feedbackAllow && formConfig && boardNameForResubmit
            ? {
                gformUrl: formConfig.gformUrl,
                board: boardNameForResubmit,
                fields: formConfig.fields,
                originalAuthor:
                  (row.name || "").split(" ↺ ")[0] || "anonymous",
              }
            : null;
        el = renderSubmission(row, rowLikes, rowReplies, formConfig, rowResubmitConfig);
      } catch (err) {
        dbg("renderSubmission ERROR", String(err));
        return;
      }
      dbg("renderSubmission returned", el ? el.className : "null");
      if (el) container.insertBefore(el, spinner);
    });

    hideSpinner();
  }

  fetchAndRender();
  setInterval(fetchAndRender, 60_000);
  document.addEventListener("fm:refresh-display", () => {
    showSpinner();
    setTimeout(fetchAndRender, 5000);
  });
}

function renderSubmission(row, likes = [], replies = [], formConfig = null, resubmitConfig = null) {
  const arrangement = row.arrangement || "";
  if (!arrangement) return null;

  const nameParts = (row.name || "").split(" ↺ ");
  const displayName = nameParts[0] || "";
  const originalAuthorName = nameParts[1] || "";

  const nameHtml = displayName
    ? `<span class="fm-submitter-name">${escapeHtml(displayName)}</span>`
    : `<span class="fm-submitter-name fm-anonymous">anonymous</span>`;
  const remixHtml = originalAuthorName
    ? `<span class="fm-remix-from">remixing ${escapeHtml(originalAuthorName)}</span>`
    : "";
  const catHtml = formatCatBadge(row.category);
  const commentHtml = row.comment
    ? `<p class="fm-submission-comment">${escapeHtml(row.comment)}</p>`
    : "";

  const headerHtml = `<div class="fm-submission-header">${nameHtml}${remixHtml}${catHtml}</div>${commentHtml}`;
  const footer = renderInteractionFooter(row, likes, replies, formConfig);

  const wrapper = document.createElement("div");
  wrapper.className = "fm-display-board";
  wrapper.innerHTML = headerHtml;

  const parsed = parseInput(arrangement);
  const hasPos = parsed.some((p) => p.x !== null);
  const maxY =
    hasPos && parsed.length ? Math.max(0, ...parsed.map((p) => p.y || 0)) : 0;
  const isSelection = row.type === "selection";
  // Use a low initialHeight so expandArea controls the tight fit (maxCardY + 58)
  const boardHeight = isSelection ? Math.max(60, maxY + 10) : Math.max(80, maxY + 10);

  const root = document.createElement("div");
  root.className = "fm-root";
  wrapper.appendChild(root);

  createCanvas(root, null, arrangement, {
    height: boardHeight,
    showEditor: false,
    feedbackConfig: resubmitConfig || null,
  });

  wrapper.appendChild(footer);
  return wrapper;
}

/* ─── Global mouse events ────────────────────────────────────────────────── */

document.addEventListener("mousemove", (e) => {
  if (drag) {
    const dx = e.clientX - drag.mx0;
    const dy = e.clientY - drag.my0;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;

    const area = document.getElementById(`fm-area-${drag.canvasId}`);
    const canvas = canvases.find((c) => c.id === drag.canvasId);

    drag.cards.forEach(({ card, startX, startY }) => {
      card.x = Math.max(0, startX + dx);
      card.y = Math.max(0, startY + dy);
      const el = getCardEl(drag.canvasId, card.id);
      if (el) {
        el.style.left = card.x + "px";
        el.style.top = card.y + "px";
      }
    });

    if (canvas) expandArea(area, canvas.cards);
    return;
  }

  if (lasso) {
    const area = document.getElementById(`fm-area-${lasso.canvasId}`);
    const rect = area.getBoundingClientRect();
    const x1 = e.clientX - rect.left;
    const y1 = e.clientY - rect.top;
    const lx = Math.min(lasso.x0, x1);
    const ly = Math.min(lasso.y0, y1);
    const lw = Math.abs(x1 - lasso.x0);
    const lh = Math.abs(y1 - lasso.y0);

    lasso.el.style.left = lx + "px";
    lasso.el.style.top = ly + "px";
    lasso.el.style.width = lw + "px";
    lasso.el.style.height = lh + "px";

    const canvas = canvases.find((c) => c.id === lasso.canvasId);
    canvas.cards.forEach((card) => {
      const el = getCardEl(lasso.canvasId, card.id);
      if (!el) return;
      const cw = el.offsetWidth;
      const ch = el.offsetHeight;
      const hit =
        card.x < lx + lw &&
        card.x + cw > lx &&
        card.y < ly + lh &&
        card.y + ch > ly;
      setSelected(card, el, hit);
    });
  }
});

document.addEventListener("mouseup", (e) => {
  if (drag) {
    const canvas = canvases.find((c) => c.id === drag.canvasId);
    if (canvas) {
      canvas.cards.forEach((c) => {
        const el = getCardEl(drag.canvasId, c.id);
        if (el) el.classList.remove("fm-dragging");
      });
    }

    if (!drag.moved && drag.clickedWasSelected && drag.clickedCard) {
      const el = getCardEl(drag.canvasId, drag.clickedCard.id);
      if (el) setSelected(drag.clickedCard, el, false);
    }

    const wasMoved = drag.moved;
    const dragCanvasId = drag.canvasId;
    drag = null;

    if (wasMoved && canvas && !canvas.modified) {
      canvas.modified = true;
      syncFeedbackBar(dragCanvasId);
    }
    return;
  }

  if (lasso) {
    lasso.el.remove();
    lasso = null;
  }
});

/* ─── Mount ──────────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  buildModal();

  // Interactive boards
  document
    .querySelectorAll(
      '.fridge-magnets-visualizer:not([data-mode="display-feedback"])',
    )
    .forEach((host) => {
      const rawCards = host.dataset.cards || "";
      const height = parseInt(host.dataset.height, 10) || 280;
      const showEditor = host.dataset.showEditor === "true";

      const feedbackConfig =
        host.dataset.feedbackAllow === "true"
          ? {
              board: host.dataset.board || "",
              gformUrl: host.dataset.gformUrl || "",
              fields: {
                arrangement: host.dataset.fieldArrangement || "",
                board: host.dataset.fieldBoard || "",
                type: host.dataset.fieldType || "",
                name: host.dataset.fieldName || "",
                category: host.dataset.fieldCategory || "",
                comment: host.dataset.fieldComment || "",
              },
            }
          : null;

      const root = document.createElement("div");
      root.className = "fm-root";
      host.replaceWith(root);

      createCanvas(root, null, rawCards, { height, showEditor, feedbackConfig });

      // "+ New Canvas" button
      const addWrap = document.createElement("div");
      addWrap.className = "fm-add-canvas-wrap";
      addWrap.innerHTML = `<button class="fm-add-canvas-btn">+ New Canvas</button>`;
      root.appendChild(addWrap);

      addWrap.querySelector(".fm-add-canvas-btn").addEventListener("click", () => {
        createCanvas(root, addWrap, "", {
          height,
          showEditor,
          feedbackConfig,
          scrollIntoView: true,
        });
      });
    });

  // Display-feedback boards
  document
    .querySelectorAll('.fridge-magnets-visualizer[data-mode="display-feedback"]')
    .forEach((host) => mountDisplayFeedback(host));
});
