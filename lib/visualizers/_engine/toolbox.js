/**
 * The shared toolbox: behavior most objects need, written once. Objects switch parts on with data
 * attributes that renderObject writes from their manifest (data-opens, data-remembers, ...).
 *
 *   open on click    any [data-bloob-toggle] inside an object opens or closes it
 *   the opening      --open moves from 0 to 1; the object's CSS draws every frame from it
 *   remember         data-remembers="visitor": this browser keeps it open next time
 *   arrival          a click on a link inside the site makes the next page play its opening
 *   the light        BloobObjects.readLight() gives the room's light as numbers
 *
 * A visualizer adds its own behavior with BloobObjects.register(shape, { duration, onFrame,
 * onOpen, onClose }): the placeholder functions it fills in, instead of rewriting any of this.
 * Browser only.
 */
import { rememberKey, openDuration } from "./state.js";
import { readLight } from "./light.js";
import { startShare } from "./share.js";
import { startPeek } from "./peek.js";
import { startToolbelt } from "./toolbelt.js";
import { startFeedback } from "./feedback.js";
import { startRoomPlay } from "./room-play.js";

const hooks = new Map();
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

function current(el) {
  return parseFloat(el.style.getPropertyValue("--open")) || 0;
}

function setProgress(el, p) {
  el.style.setProperty("--open", p.toFixed(4));
  el.dispatchEvent(new CustomEvent("bloob:frame", { detail: { progress: p } }));
  hooks.get(el.dataset.shape)?.onFrame?.(el, p);
}

function animateTo(el, target) {
  return new Promise((resolve) => {
    cancelAnimationFrame(el._bloobFrame);
    const from = current(el);
    const hook = hooks.get(el.dataset.shape);
    // How tall the open part really is, so CSS can unroll or expand to exactly that height. A shape
    // marks the part that holds its content with data-bloob-measure (a rolled note's paper is cut
    // short while rolled, so the open part's own height would be the rolled one).
    const measured = el.querySelector("[data-bloob-measure]") || el.querySelector(".bloob-object__open");
    const height = measured?.scrollHeight || 0;
    if (height) el.style.setProperty("--full-height", `${height}px`);
    const ms = Math.max(1, hook?.duration?.(el, target) ?? openDuration({ height, pace: el.dataset.pace }));
    if (reduceMotion()) {
      setProgress(el, target);
      return resolve();
    }
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      setProgress(el, from + (target - from) * ease(k));
      if (k < 1) el._bloobFrame = requestAnimationFrame(step);
      else resolve();
    };
    el._bloobFrame = requestAnimationFrame(step);
  });
}

// The closed look (a marble's picture) must be on screen before anything unfolds from it, in a
// room, a peek or on arrival. Waits for its pictures to load and decode; never more than a few
// seconds, and a picture that fails to load doesn't hold it up.
function closedLookReady(el, maxMs = 4000) {
  const imgs = [...el.querySelectorAll(".bloob-object__closed img")].filter((img) => img.getAttribute("src"));
  if (!imgs.length) return Promise.resolve();
  const loaded = imgs.map((img) =>
    img.complete && img.naturalWidth
      ? img.decode?.().catch(() => {})
      : new Promise((res) => {
          img.addEventListener("load", () => res(img.decode?.().catch(() => {})), { once: true });
          img.addEventListener("error", res, { once: true });
        }),
  );
  return Promise.race([Promise.all(loaded), new Promise((res) => setTimeout(res, maxMs))]);
}

async function open(el) {
  el.dataset.state = "opening";
  await closedLookReady(el);
  if (el.dataset.state !== "opening") return; // closed again while it waited
  await animateTo(el, 1);
  el.dataset.state = "open";
  if (el.dataset.remembers === "visitor") try { localStorage.setItem(rememberKey(el.dataset.pageId), "1"); } catch {}
  el.dispatchEvent(new CustomEvent("bloob:open"));
  hooks.get(el.dataset.shape)?.onOpen?.(el);
}

async function close(el) {
  el.dataset.state = "closing";
  await animateTo(el, 0);
  el.dataset.state = "closed";
  if (el.dataset.remembers === "visitor") try { localStorage.removeItem(rememberKey(el.dataset.pageId)); } catch {}
  el.dispatchEvent(new CustomEvent("bloob:close"));
  hooks.get(el.dataset.shape)?.onClose?.(el);
}

function toggle(el) {
  return el.dataset.state === "open" || el.dataset.state === "opening" ? close(el) : open(el);
}

function start() {
  const html = document.documentElement;
  const initial = html.dataset.bhInitial || "open";
  const pageId = document.querySelector('meta[name="bloob-page-id"]')?.content;
  for (const el of document.querySelectorAll(".bloob-object[data-opens]")) {
    const mine = el.dataset.pageId === pageId;
    const state = mine ? initial : "closed";
    setProgress(el, state === "open" ? 1 : 0);
    el.dataset.state = state === "open" ? "open" : "closed";
    if (state === "play") requestAnimationFrame(() => open(el));
    if (state === "open" && mine && location.hash) {
      let id = location.hash.slice(1);
      try { id = decodeURIComponent(id); } catch {} // a malformed #hash must not stop the toolbox
      document.getElementById(id)?.scrollIntoView();
    }
  }
  html.removeAttribute("data-bh-initial");
}

document.addEventListener(
  "click",
  (event) => {
    const control = event.target.closest?.("[data-bloob-toggle]");
    if (control) {
      const el = control.closest(".bloob-object");
      if (el) {
        event.preventDefault();
        toggle(el);
      }
      return;
    }
    const link = event.target.closest?.("a[href]");
    if (link && link.origin === location.origin && !link.target && !link.hasAttribute("download")) {
      try { sessionStorage.setItem("bh-arrive", link.pathname); } catch {}
    }
  },
  true,
);

window.BloobObjects = {
  register(shape, handlers) {
    hooks.set(shape, handlers);
  },
  open,
  close,
  readLight,
};

const startAll = () => { start(); startShare(); startToolbelt(); window.BloobObjects.peek = startPeek({ open }); startFeedback(); startRoomPlay(); };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAll);
else startAll();
