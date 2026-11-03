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
import { rememberKey } from "./state.js";
import { readLight } from "./light.js";

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
    const ms = Math.max(1, hook?.duration?.(el, target) ?? (Number(el.dataset.openMs) || 900));
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

async function open(el) {
  el.dataset.state = "opening";
  await animateTo(el, 1);
  el.dataset.state = "open";
  if (el.dataset.remembers === "visitor") localStorage.setItem(rememberKey(el.dataset.pageId), "1");
  el.dispatchEvent(new CustomEvent("bloob:open"));
  hooks.get(el.dataset.shape)?.onOpen?.(el);
}

async function close(el) {
  el.dataset.state = "closing";
  await animateTo(el, 0);
  el.dataset.state = "closed";
  if (el.dataset.remembers === "visitor") localStorage.removeItem(rememberKey(el.dataset.pageId));
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
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
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
      sessionStorage.setItem("bh-arrive", link.pathname);
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

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
