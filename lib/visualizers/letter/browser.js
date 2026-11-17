/**
 * browser.js — the letter's own behavior on a page: folding it shut when its note says
 * `state: sealed` or `state: opened`, the three taps that tear it open, taking the paper out, and
 * remembering in this browser that it was opened. Behavior only: the page's HTML already holds the
 * whole letter, unfolded (index.js), so without script, for a screen reader and for a search
 * engine the words are simply there. Every frame of the envelope comes from the pure renderer.
 *
 * Imports only renderer.js, so another host (the post office) can use it as it is.
 *
 * What it expects in the page (index.js writes it):
 *   .bh-letter[data-letter-state="sealed" | "opened"][data-letter-envelope="{json}"]
 *     .bh-letter__outside   the envelope; redrawn here
 *     .bh-letter__act       hidden; holds the one real button
 *     .bh-paper             the open sheet
 *
 * Appear whole (visualizers.md): the letter waits unseen until it is folded, then shows as one
 * piece. BloobObjects.assembled is called when the engine is on the page; the letter's own look
 * does the waiting, so it works on a theme without the engine too.
 */
import { renderClosed, renderTearing, TEARS } from "./renderer.js";

const MEMORY = "bh-letter-opened:";
const TAKE_OUT_MS = 1500; // styles.css, bh-takeout
const LAST_TEAR_MS = 700; // the torn strip floats off and the paper shows before it is taken out

const still = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};
// Storage may be missing or may throw (private windows, blocked cookies): then nothing is remembered.
function remembered(key) {
  try { return window.localStorage.getItem(key) === "1"; } catch { return false; }
}
function remember(key) {
  try { window.localStorage.setItem(key, "1"); } catch { /* not remembered; the letter still opens */ }
}
function assembled(el) {
  try { window.BloobObjects?.assembled?.(el); } catch { /* the engine is not needed for this */ }
  el.classList.add("is-assembled");
}

function start(el, index) {
  const state = el.dataset.letterState;
  const key = MEMORY + window.location.pathname + (index ? `#${index}` : "");
  const outside = el.querySelector(".bh-letter__outside");
  const act = el.querySelector(".bh-letter__act");
  const button = act?.querySelector("button");
  const paper = el.querySelector(".bh-paper");
  let env = null;
  try { env = JSON.parse(el.dataset.letterEnvelope || "null"); } catch { env = null; }
  // Anything missing, or already opened in this browser: it stays as the page has it, unfolded.
  if (!env || !outside || !act || !button || !paper || (state !== "sealed" && state !== "opened") || remembered(key)) {
    assembled(el);
    return;
  }

  // the top of the paper as the page has it: its date line and its words
  const inside = { html: paper.querySelector(".bh-paper__body")?.innerHTML || "", date: paper.querySelector(".bh-paper__date")?.textContent || undefined };
  const pips = button.querySelector(".bh-letter__pips");
  let tears = 0;
  let out = false;

  const draw = () => {
    outside.innerHTML = state === "opened" ? renderClosed({ ...env, opened: "yes" }, inside) : renderTearing(env, tears, inside);
    if (state === "sealed") {
      button.setAttribute("aria-label", `Tear open, ${tears} of ${TEARS}`);
      if (pips) pips.textContent = "\u25cf".repeat(tears) + "\u25cb".repeat(TEARS - tears);
    }
  };

  const takeOut = () => {
    if (out) return;
    out = true;
    remember(key);
    act.hidden = true;
    paper.hidden = false;
    el.classList.remove("is-folded");
    el.classList.add("is-opening");
    el.setAttribute("data-bh-taking", "");
    // the button is gone: the reader's place moves to the words
    paper.setAttribute("tabindex", "-1");
    try { paper.focus({ preventScroll: true }); } catch { /* focus is a courtesy */ }
    window.setTimeout(() => {
      el.removeAttribute("data-bh-taking");
      el.classList.add("is-out");
    }, still() ? 0 : TAKE_OUT_MS);
  };

  const step = () => {
    if (out) return;
    if (state === "sealed") {
      if (tears >= TEARS) return;
      tears += 1;
      draw();
      if (tears >= TEARS) window.setTimeout(takeOut, still() ? 0 : LAST_TEAR_MS);
      return;
    }
    takeOut();
  };

  paper.hidden = true;
  act.hidden = false;
  el.classList.add("is-folded");
  draw();
  button.addEventListener("click", (event) => { event.stopPropagation(); step(); });
  outside.addEventListener("click", step); // a tap on the envelope counts too; the button is the keyboard's way
  assembled(el);
}

function startAll() {
  document.querySelectorAll(".bh-letter[data-letter-state]").forEach((el, index) => {
    if (el.dataset.letterStarted) return;
    el.dataset.letterStarted = "1";
    try { start(el, index); } catch { assembled(el); }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAll);
else startAll();
