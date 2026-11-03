/**
 * The marble's own behavior: the live glass. A canvas over the baked picture draws the marble's
 * picture (or its own color) through the glass again, moving a little as the page scrolls
 * (scroll only, no cursor), at half sharpness while moving. The opening itself (light swelling,
 * the funnel, the sheet) is CSS drawn from --open; the toolbox drives it. Behavior only: the
 * baked picture stays in the HTML.
 */
import { glassMap, glassDraw, burnIn, pearlSheen, GLASS } from "./glass.js";
import { insideColor, hexToRgb } from "./color.js";

const SOURCE = 512; // the picture as the glass reads it: sharp on a retina screen
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PEARL = "/assets/visualizers/marble/pearl.png";

// Leon's own marble picture (its ribbon swirl) as pixels of the given size, or null.
function loadPearl(size) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      resolve(ctx.getImageData(0, 0, size, size).data);
    };
    img.onerror = () => resolve(null);
    img.src = PEARL;
  });
}

function loadPicture(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = SOURCE;
        const ctx = c.getContext("2d");
        const s = Math.max(SOURCE / img.naturalWidth, SOURCE / img.naturalHeight);
        const w = img.naturalWidth * s, h = img.naturalHeight * s;
        ctx.drawImage(img, (SOURCE - w) / 2, (SOURCE - h) / 2, w, h);
        resolve(ctx.getImageData(0, 0, SOURCE, SOURCE).data);
      } catch {
        resolve(null); // a picture from another site can't be read; the baked marble stays
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function liven(ball) {
  const photo = await loadPicture(ball.dataset.image);
  const color = /^#[0-9a-f]{6}$/i.test(ball.dataset.color || "") ? ball.dataset.color : null;
  if (!photo && !color) return;
  const pixels = photo || insideColor(hexToRgb(color), SOURCE);
  const see = photo ? GLASS.seeImage : GLASS.seeColor;

  const size = Math.min(640, Math.round(ball.clientWidth * Math.min(2, window.devicePixelRatio || 1)));
  const half = Math.max(32, size >> 1);
  const maps = { [size]: glassMap(size), [half]: glassMap(half) };
  const sheens = { [size]: pearlSheen(maps[size]), [half]: pearlSheen(maps[half]) };
  const pearls = { [size]: await loadPearl(size), [half]: await loadPearl(half) };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "no-zoom";
  const ctx = canvas.getContext("2d");
  const small = document.createElement("canvas");
  small.width = small.height = half;

  const draw = (n) => {
    const r = ball.getBoundingClientRect();
    const fromCenter = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    const shift = still() ? 0 : fromCenter * GLASS.movement;
    const out = glassDraw(pixels, SOURCE, SOURCE, maps[n], { seeMiddle: see, seeEdge: GLASS.seeEdge }, 0, shift);
    burnIn(out, sheens[n], maps[n].cover, GLASS.shine);
    if (pearls[n]) burnIn(out, pearls[n], maps[n].cover, GLASS.pearl);
    const target = n === size ? ctx : small.getContext("2d");
    target.putImageData(new ImageData(out, n, n), 0, 0);
    if (n !== size) {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(small, 0, 0, size, size);
    }
  };

  draw(size);
  ball.querySelector("[data-bloob-picture]")?.after(canvas);
  ball.classList.add("is-live");

  let queued = false, settle = null;
  addEventListener("scroll", () => {
    if (still() || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      draw(half);
      clearTimeout(settle);
      settle = setTimeout(() => draw(size), 140);
    });
  }, { passive: true });
}

const seen = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { seen.unobserve(e.target); liven(e.target); }
});
document.querySelectorAll(".bloob-object--marble .marble-ball").forEach((ball) => seen.observe(ball));
