/**
 * The visitor's tool belt: their own settings for this site, kept in their browser only. Opens
 * from a small button in their corner of the page. A setting is a checkbox with data-setting="<key>";
 * checked stores "on". Browser only.
 */
export function startToolbelt(root = document) {
  const belt = root.querySelector(".toolbelt");
  if (!belt) return;
  const button = belt.querySelector(".toolbelt__open");
  const panel = belt.querySelector(".toolbelt__panel");
  const show = (open) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };
  button.addEventListener("click", () => show(panel.hidden));
  document.addEventListener("click", (e) => { if (!belt.contains(e.target)) show(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { show(false); button.focus(); } });

  belt.querySelectorAll("input[data-setting]").forEach((box) => {
    const key = box.dataset.setting;
    try { box.checked = localStorage.getItem(key) === "on"; } catch {}
    box.addEventListener("change", () => {
      try { box.checked ? localStorage.setItem(key, "on") : localStorage.removeItem(key); } catch {}
    });
  });
}
