/**
 * The outermost object's share row (rendered by renderObject): copy link, the phone's share
 * sheet, copy markdown (source.md beside the page), the baked picture, and PDF through the
 * browser's print. Small buttons collapsed together; hovering or focusing the row opens every
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
  markdown: (btn) =>
    fetch(new URL("source.md", pageUrl()))
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((md) => navigator.clipboard.writeText(md))
      .then(() => confirm(btn, "Copied"), () => confirm(btn, "Not available")),
  picture: (btn) => {
    const img = btn.closest(".bloob-object")?.querySelector("[data-bloob-picture]");
    if (!img?.src) return;
    const a = document.createElement("a");
    a.href = img.src;
    a.download = (document.title || "marble").replace(/[^\w-]+/g, "-") + ".png";
    a.click();
  },
  pdf: () => window.print(),
};

export function startShare(root = document) {
  root.querySelectorAll(".bloob-share").forEach((row) => {
    if (!navigator.share) row.querySelector('[data-share-action="share"]')?.remove();
    if (!row.closest(".bloob-object")?.querySelector("[data-bloob-picture]")) row.querySelector('[data-share-action="picture"]')?.remove();
    keepRowOpen(row);
    row.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-share-action]");
      if (btn) ACTIONS[btn.dataset.shareAction]?.(btn);
    });
  });
}
