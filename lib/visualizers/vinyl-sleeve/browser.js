/**
 * The vinyl sleeve's own behavior: the 3D sleeve over the cover picture (three.js r128, loaded
 * only on pages that have a sleeve, once it comes into view), and the music video once the page
 * is open. Taking the record out opens the page; tucking it back in closes it. Without WebGL or
 * three.js the cover stays a picture and a click still opens the page.
 */
import { mountSleeve } from "./sleeve-3d.js";

const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
let threeLoading = null;
function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (!threeLoading) {
    threeLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = THREE_URL;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return threeLoading;
}

const webgl = () => {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
};
const color = (v) => (/^#[0-9a-f]{3,8}$/i.test(v || "") ? v : "#0b0b0d");

function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.endsWith("youtube.com")) return u.searchParams.get("v") || u.pathname.split("/").pop();
  } catch {}
  return null;
}
function embedVideo(el) {
  const a = el.querySelector(".vinyl-video a[data-youtube]");
  const id = a && youtubeId(a.getAttribute("href"));
  if (!id || !/^[\w-]{6,20}$/.test(id)) return;
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${id}`;
  f.title = "Music video";
  f.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  f.loading = "lazy";
  a.replaceWith(f);
}

// Appear whole: the sleeve shows once its 3D has drawn, or once its cover has loaded without 3D.
const assembled = (el) => window.BloobObjects?.assembled?.(el);
function coverWhole(el) {
  const img = [...el.querySelectorAll(".vinyl-cover__picture")].find((i) => i.offsetParent !== null);
  if (!img || (img.complete && img.naturalWidth)) return assembled(el);
  img.addEventListener("load", () => assembled(el), { once: true });
  img.addEventListener("error", () => assembled(el), { once: true });
}

function liven(el) {
  const stage = el.querySelector(".vinyl-stage");
  el.addEventListener("bloob:open", () => embedVideo(el), { once: true });
  if (el.dataset.state === "open") embedVideo(el);
  if (!stage || !stage.dataset.front || !webgl()) return coverWhole(el);
  loadThree().then(() => {
    const d = stage.dataset;
    const sleeve = mountSleeve(stage, {
      front: d.front,
      back: d.back || d.front,
      label: d.label || undefined,
      startSide: d.startSide === "front" ? "front" : "back",
      vinylColor: color(d.vinylColor),
      onReveal: () => window.BloobObjects?.open(el),
      onTuck: () => window.BloobObjects?.close(el),
    });
    sleeve.ready.then(
      () => { el.classList.add("is-live"); requestAnimationFrame(() => requestAnimationFrame(() => assembled(el))); },
      () => { sleeve.destroy(); coverWhole(el); },
    );
  }, () => coverWhole(el));
}

const seen = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { seen.unobserve(e.target); liven(e.target); }
});
const watch = (root) => root.querySelectorAll?.(".bloob-object--vinyl-sleeve:not([data-live-watched])").forEach((el) => {
  el.dataset.liveWatched = "";
  seen.observe(el);
});
watch(document);
new MutationObserver((records) => {
  for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) watch(n);
}).observe(document.body, { childList: true, subtree: true });
