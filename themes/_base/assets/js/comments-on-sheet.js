/**
 * Comments sit on the sheet, by day and by night (Leon's feedback d0ed84d9, d598fddf).
 *
 * FastComments draws its thread in an iframe and styles that iframe `color-scheme: normal
 * !important`. When the page's own colour scheme is dark (night, or a dark system with the page
 * set to day), the browser sees the frame and the page disagree about the scheme and paints an
 * opaque white backdrop behind the frame: the white box. The frame's page is a light page, so we
 * say so on the frame element (`light`, which an inline `!important` only lets script set); the
 * backdrop then stays clear and the thread sits on the sheet. We never touch the frame's inside.
 *
 * Its text colours follow FastComments' documented `hasDarkBackground` option, which it guesses
 * once from the background behind it. When the visitor switches day and night, we tell it again
 * through its documented `instance.update()`; changing only that option updates the thread in
 * place, without reloading it.
 *
 * Loaded by themes/_base/partials/comments.njk right after the site's comment snippet.
 */
(function () {
  if (window.__bloobCommentsOnSheet) return;
  window.__bloobCommentsOnSheet = true;

  function sections() {
    return document.querySelectorAll(".bloob-comments");
  }

  function lightFrames() {
    sections().forEach(function (s) {
      s.querySelectorAll("iframe").forEach(function (f) {
        if (f.style.getPropertyValue("color-scheme") === "light" && f.style.getPropertyPriority("color-scheme") === "important") return;
        f.style.setProperty("color-scheme", "light", "important");
      });
    });
  }

  // Whether the first solid background behind an element is dark (the same question FastComments
  // asks when it guesses). Colours it can't read are skipped.
  function onDark(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var m = /^rgba?\(([^)]+)\)$/.exec(getComputedStyle(n).backgroundColor || "");
      if (!m) continue;
      var p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (p.length > 3 && p[3] === 0) continue;
      return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] < 128;
    }
    return false;
  }

  // The comment threads on this page, each with the background FastComments last knew about.
  var known = new Map();
  function threads() {
    return (window.fcUIInstances || []).filter(function (t) {
      return t && t.instance && typeof t.instance.update === "function" && t.targetElement && t.targetElement.closest && t.targetElement.closest(".bloob-comments");
    });
  }
  function remember() {
    threads().forEach(function (t) { if (!known.has(t)) known.set(t, onDark(t.targetElement)); });
  }
  var queued = false;
  function follow() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      threads().forEach(function (t) {
        var dark = onDark(t.targetElement);
        if (!known.has(t)) { known.set(t, dark); return; }
        if (known.get(t) === dark) return;
        known.set(t, dark);
        try { t.instance.update({ hasDarkBackground: dark }); } catch (e) {}
      });
    });
  }

  lightFrames();
  remember();
  // FastComments draws a new frame when its config changes in more than the background.
  sections().forEach(function (s) {
    new MutationObserver(function () { lightFrames(); remember(); }).observe(s, { childList: true, subtree: true });
  });
  // Day and night: the visitor's choice (an attribute on <html>) or the system's.
  new MutationObserver(follow).observe(document.documentElement, { attributes: true });
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", follow); } catch (e) {}
})();
