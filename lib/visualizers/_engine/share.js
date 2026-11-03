/**
 * The outermost object's share row (rendered by renderObject): copy link, the phone's share
 * sheet, copy markdown (source.md beside the page), copy image (a card with the object, its
 * title and subtitle, and the page's full address, so a phone can open it), and PDF through
 * the browser's print. Small buttons collapsed together; hovering or focusing the row opens every
 * name, and it stays open while the pointer is anywhere on it. Browser only.
 */

/** Opens a row while the pointer or focus is on it; closes after a short grace once both leave. */
export function keepRowOpen(row, { grace = 250 } = {}) {
  let timer = null;
  const open = () => { clearTimeout(timer); row.classList.add("is-open"); };
  const close = () => { clearTimeout(timer); timer = setTimeout(() => row.classList.remove("is-open"), grace); };
  row.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") open(); });
  row.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !row.contains(document.activeElement)) close(); });
  row.addEventListener("focusin", open);
  row.addEventListener("focusout", (e) => { if (!row.contains(e.relatedTarget)) close(); });
}

function confirm(btn, words) {
  const label = btn.querySelector(".bloob-share__label");
  const before = label.textContent;
  label.textContent = words;
  btn.classList.add("is-done");
  setTimeout(() => { label.textContent = before; btn.classList.remove("is-done"); }, 1600);
}

const pageUrl = () => location.href.split("#")[0];

const ACTIONS = {
  link: (btn) => navigator.clipboard.writeText(pageUrl()).then(() => confirm(btn, "Copied")),
  share: () => navigator.share({ title: document.title, url: pageUrl() }).catch(() => {}),
  // Safari keeps the click's permission only if the clipboard gets a promise right away.
  markdown: (btn) => {
    const text = fetch(new URL("source.md", pageUrl())).then((r) => (r.ok ? r.text() : Promise.reject(new Error("no source"))));
    const copied =
      navigator.clipboard?.write && typeof ClipboardItem !== "undefined"
        ? navigator.clipboard.write([new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })])
        : text.then((t) => navigator.clipboard.writeText(t));
    copied.then(() => confirm(btn, "Copied"), () => confirm(btn, "Not available"));
  },
  image: (btn) => {
    const url = pageUrl();
    const png = drawCard(btn.closest(".bloob-share"), url);
    const done = () => confirm(btn, "Copied");
    const save = () => png.then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (document.title || "bloob").replace(/[^\w-]+/g, "-").slice(0, 60) + ".png";
      a.click();
      confirm(btn, "Saved");
    });
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") return save();
    navigator.clipboard
      .write([new ClipboardItem({ "image/png": png, "text/plain": new Blob([url], { type: "text/plain" }) })])
      .then(done, () => navigator.clipboard.write([new ClipboardItem({ "image/png": png })]).then(done, save));
  },
  pdf: () => window.print(),
};

export function startShare(root = document) {
  root.querySelectorAll(".bloob-share").forEach((row) => {
    if (!navigator.share) row.querySelector('[data-share-action="share"]')?.remove();
    keepRowOpen(row);
    row.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-share-action]");
      if (btn) ACTIONS[btn.dataset.shareAction]?.(btn);
    });
  });
}

/** Breaks text into lines no wider than maxWidth; after maxLines, the last line ends with "…". Pure. */
export function wrapWords(text, measure, maxWidth, maxLines = Infinity) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  else if (lines.length === maxLines && line) lines[maxLines - 1] += "…";
  return lines;
}

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

// The card: the object's closed look (the baked marble, or the note's first lines on paper), its
// title and subtitle, and the full address. Drawn in the theme's colors and fonts.
async function drawCard(row, url) {
  const W = 1080, H = 1350, pad = 90;
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const bg = v("--card-bg", "#fbf8f1"), ink = v("--surface-text-color", "#2a2118"), soft = v("--text-light", "#7a6e62");
  const serif = v("--font-heading", "Georgia, serif"), sans = v("--font-label", "system-ui, sans-serif");
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  let y = pad;
  const picture = row.closest(".bloob-object")?.querySelector("[data-bloob-picture]");
  const img = picture?.src ? await loadImage(picture.src) : null;
  if (img) {
    const size = 620;
    ctx.drawImage(img, (W - size) / 2, y, size, size);
    y += size + 70;
  } else if (row.dataset.lines) {
    ctx.fillStyle = v("--object-paper", "#f6efdf");
    ctx.fillRect(pad, y, W - 2 * pad, 560);
    ctx.fillStyle = v("--object-ink", ink);
    ctx.font = `34px ${serif}`;
    let ly = y + 80;
    for (const line of wrapWords(row.dataset.lines, (t) => ctx.measureText(t).width, W - 4 * pad, 9)) {
      ctx.fillText(line, pad * 2, ly);
      ly += 52;
    }
    y += 560 + 70;
  } else {
    y += 160;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = `600 58px ${serif}`;
  for (const line of wrapWords(row.dataset.title || document.title, (t) => ctx.measureText(t).width, W - 2 * pad, 3)) {
    ctx.fillText(line, W / 2, y);
    y += 70;
  }
  if (row.dataset.subtitle) {
    ctx.fillStyle = soft;
    ctx.font = `italic 38px ${serif}`;
    for (const line of wrapWords(row.dataset.subtitle, (t) => ctx.measureText(t).width, W - 2 * pad, 2)) {
      ctx.fillText(line, W / 2, y + 6);
      y += 50;
    }
  }
  ctx.fillStyle = v("--link-color", ink);
  ctx.font = `500 30px ${sans}`;
  const address = url.replace(/^https?:\/\//, "");
  wrapWords(address.replace(/\//g, "/ ").trim(), (t) => ctx.measureText(t).width, W - 2 * pad, 2)
    .map((l) => l.replace(/\/ /g, "/"))
    .forEach((line, i, all) => ctx.fillText(line, W / 2, H - pad - (all.length - 1 - i) * 42));

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}
