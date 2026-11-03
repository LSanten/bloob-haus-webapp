/**
 * The visitor's tool belt: their own settings for this site, kept in their browser only. Opens
 * from a small button in their corner of the page. A setting is a checkbox with data-setting="<key>"
 * (stored as on or off, data-default="on" to start on); while off, <html> carries the class <key>-off. Browser only.
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
    // A setting may start on (data-default="on"); the visitor's own choice is kept as on or off.
    let stored = null;
    try { stored = localStorage.getItem(key); } catch {}
    box.checked = stored ? stored === "on" : box.dataset.default === "on";
    document.documentElement.classList.toggle(`${key}-off`, !box.checked);
    box.addEventListener("change", () => {
      try { localStorage.setItem(key, box.checked ? "on" : "off"); } catch {}
      document.documentElement.classList.toggle(`${key}-off`, !box.checked);
    });
  });
}
