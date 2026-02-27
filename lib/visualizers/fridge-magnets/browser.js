/**
 * Fridge Magnets Visualizer — Runtime
 *
 * Mounts an interactive magnet board into each .fridge-magnets-visualizer div.
 * Cards are pre-loaded from the data-cards attribute (set by the build-time transform).
 * Users can drag cards, lasso-select groups, add new canvases, and load their own cards.
 */

/* ─── State ─────────────────────────────────────────── */
let canvasIdCounter = 0;
let cardIdCounter = 0;
const canvases = [];

/* ─── Drag state (global) ───────────────────────────── */
let drag = null;

/* ─── Lasso state ───────────────────────────────────── */
let lasso = null;

/* ─── Parse ──────────────────────────────────────────── */
function parseInput(text) {
  const matches = [...text.matchAll(/\[([^\]]+)\]/g)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

function countWords(texts) {
  return texts.reduce(
    (n, t) => n + t.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

/* ─── Canvas factory ─────────────────────────────────── */
function addCanvas(root, preloadText = "", initialHeight = 280) {
  const id = ++canvasIdCounter;
  const canvas = {
    id,
    cards: [],
    inputText: preloadText,
  };
  canvases.push(canvas);

  const wrapper = document.createElement("div");
  wrapper.className = "fm-canvas-wrapper";
  wrapper.id = `fm-cw-${id}`;
  wrapper.innerHTML = `
    <div class="fm-canvas-header">
      <span class="fm-canvas-stats" id="fm-stats-${id}">0 words · 0 cards</span>
      <button class="fm-clear-btn" title="Clear canvas">Clear</button>
      <button class="fm-copy-btn" title="Copy card text as [bracket] string">Copy</button>
    </div>
    <div class="fm-canvas-area" id="fm-area-${id}" style="min-height:${initialHeight}px"></div>
    <div class="fm-canvas-input-area">
      <div class="fm-input-row">
        <textarea id="fm-inp-${id}" placeholder="[Your] [words] [here] — wrap each card in brackets" spellcheck="false">${preloadText}</textarea>
        <button class="fm-load-btn">Load →</button>
      </div>
      <div class="fm-input-hint">
        <span><b>Drag</b> to rearrange · <b>Click</b> to select · <b>Lasso</b> on empty space to group-select · <b>Dbl-click</b> to solo-select</span>
      </div>
    </div>
  `;

  root.appendChild(wrapper);

  wrapper.querySelector(".fm-load-btn").addEventListener("click", () => {
    const text = wrapper.querySelector(`#fm-inp-${id}`).value;
    canvas.inputText = text;
    loadCards(id);
  });

  wrapper.querySelector(".fm-copy-btn").addEventListener("click", () => copyCanvas(id));

  wrapper.querySelector(".fm-clear-btn").addEventListener("click", () => {
    const area = document.getElementById(`fm-area-${id}`);
    area.innerHTML = "";
    canvas.cards = [];
    updateStats(id);
  });

  const area = document.getElementById(`fm-area-${id}`);
  area.addEventListener("mousedown", (e) => {
    if (e.target !== area) return;
    deselectAll(id);
    const rect = area.getBoundingClientRect();
    const x0 = e.clientX - rect.left + area.scrollLeft;
    const y0 = e.clientY - rect.top + area.scrollTop;
    const el = document.createElement("div");
    el.className = "fm-lasso";
    el.style.left = x0 + "px";
    el.style.top = y0 + "px";
    el.style.width = "0";
    el.style.height = "0";
    area.appendChild(el);
    lasso = { canvasId: id, el, x0, y0, canvasRect: rect };
  });

  if (preloadText) loadCards(id, initialHeight);
}

/* ─── Load / layout cards ───────────────────────────── */
function loadCards(canvasId, initialHeight) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas) return;

  const inp = document.getElementById(`fm-inp-${canvasId}`);
  const text = inp ? inp.value : canvas.inputText;
  const texts = parseInput(text);
  const area = document.getElementById(`fm-area-${canvasId}`);

  area.innerHTML = "";
  canvas.cards = [];

  texts.forEach((t) => {
    const card = {
      id: ++cardIdCounter,
      text: t,
      x: 0,
      y: 0,
      selected: false,
      canvasId,
    };
    canvas.cards.push(card);
    area.appendChild(makeCardEl(card, canvasId));
  });

  requestAnimationFrame(() => {
    layoutCards(area, canvas.cards, initialHeight);
    updateStats(canvasId);
  });
}

function makeCardEl(card, canvasId) {
  const el = document.createElement("div");
  el.className = "fm-card";
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

/* ─── Selection helpers ──────────────────────────────── */
function setSelected(card, el, val) {
  card.selected = val;
  el.classList.toggle("fm-selected", val);
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

/* ─── Stats & Copy ───────────────────────────────────── */
function updateStats(canvasId) {
  const canvas = canvases.find((c) => c.id === canvasId);
  const el = document.getElementById(`fm-stats-${canvasId}`);
  if (!canvas || !el) return;
  const texts = canvas.cards.map((c) => c.text);
  const words = countWords(texts);
  el.textContent = `${words} word${words !== 1 ? "s" : ""} · ${texts.length} card${texts.length !== 1 ? "s" : ""}`;
}

function copyCanvas(canvasId) {
  const canvas = canvases.find((c) => c.id === canvasId);
  if (!canvas || !canvas.cards.length) return;

  const sorted = [...canvas.cards].sort((a, b) => {
    const rowDiff = Math.floor(a.y / 48) - Math.floor(b.y / 48);
    return rowDiff !== 0 ? rowDiff : a.x - b.x;
  });

  const text = sorted.map((c) => `[${c.text}]`).join(" ");
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`#fm-cw-${canvasId} .fm-copy-btn`);
    if (!btn) return;
    btn.textContent = "Copied ✓";
    btn.classList.add("fm-copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("fm-copied");
    }, 1600);
  });
}

/* ─── Global mouse events ───────────────────────────── */
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

    drag = null;
    return;
  }

  if (lasso) {
    lasso.el.remove();
    lasso = null;
  }
});

/* ─── Mount all visualizer containers on page load ───── */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".fridge-magnets-visualizer").forEach((host) => {
    const rawCards = host.dataset.cards || "";
    const height = parseInt(host.dataset.height, 10) || 280;

    // Root element: replaces the host div in the flow
    const root = document.createElement("div");
    root.className = "fm-root";
    host.replaceWith(root);

    // First canvas — pre-loaded from the code fence data
    addCanvas(root, rawCards, height);

    // "+ New Canvas" button — pushes page content down naturally
    const addWrap = document.createElement("div");
    addWrap.className = "fm-add-canvas-wrap";
    addWrap.innerHTML = `<button class="fm-add-canvas-btn">+ New Canvas</button>`;
    root.appendChild(addWrap);

    addWrap.querySelector(".fm-add-canvas-btn").addEventListener("click", () => {
      // Insert new canvas before the add button
      const newWrapper = document.createElement("div");
      root.insertBefore(newWrapper, addWrap);
      // addCanvas appends to root, so we need a target — refactor slightly:
      addCanvasBefore(root, addWrap, "", height);
    });
  });
});

/* ─── Insert canvas before a reference node ─────────── */
function addCanvasBefore(root, refNode, preloadText = "", initialHeight = 280) {
  const id = ++canvasIdCounter;
  const canvas = { id, cards: [], inputText: preloadText };
  canvases.push(canvas);

  const wrapper = document.createElement("div");
  wrapper.className = "fm-canvas-wrapper";
  wrapper.id = `fm-cw-${id}`;
  wrapper.innerHTML = `
    <div class="fm-canvas-header">
      <span class="fm-canvas-stats" id="fm-stats-${id}">0 words · 0 cards</span>
      <button class="fm-clear-btn" title="Clear canvas">Clear</button>
      <button class="fm-copy-btn" title="Copy card text as [bracket] string">Copy</button>
    </div>
    <div class="fm-canvas-area" id="fm-area-${id}" style="min-height:${initialHeight}px"></div>
    <div class="fm-canvas-input-area">
      <div class="fm-input-row">
        <textarea id="fm-inp-${id}" placeholder="[Your] [words] [here] — wrap each card in brackets" spellcheck="false">${preloadText}</textarea>
        <button class="fm-load-btn">Load →</button>
      </div>
      <div class="fm-input-hint">
        <span><b>Drag</b> to rearrange · <b>Click</b> to select · <b>Lasso</b> on empty space to group-select · <b>Dbl-click</b> to solo-select</span>
      </div>
    </div>
  `;

  root.insertBefore(wrapper, refNode);

  wrapper.querySelector(".fm-load-btn").addEventListener("click", () => {
    const text = wrapper.querySelector(`#fm-inp-${id}`).value;
    canvas.inputText = text;
    loadCards(id, initialHeight);
  });

  wrapper.querySelector(".fm-copy-btn").addEventListener("click", () => copyCanvas(id));

  wrapper.querySelector(".fm-clear-btn").addEventListener("click", () => {
    const area = document.getElementById(`fm-area-${id}`);
    area.innerHTML = "";
    canvas.cards = [];
    updateStats(id);
  });

  const area = document.getElementById(`fm-area-${id}`);
  area.addEventListener("mousedown", (e) => {
    if (e.target !== area) return;
    deselectAll(id);
    const rect = area.getBoundingClientRect();
    const x0 = e.clientX - rect.left + area.scrollLeft;
    const y0 = e.clientY - rect.top + area.scrollTop;
    const el = document.createElement("div");
    el.className = "fm-lasso";
    el.style.left = x0 + "px";
    el.style.top = y0 + "px";
    el.style.width = "0";
    el.style.height = "0";
    area.appendChild(el);
    lasso = { canvasId: id, el, x0, y0, canvasRect: rect };
  });

  // Scroll new canvas into view
  setTimeout(() => wrapper.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}
