// The background's warm dots follow the cursor or a finger. The position is written only to the
// warm-dots layer, once per frame, so nothing else restyles on every move.
(function () {
  var hot = document.querySelector(".world__dots-warm");
  if (!hot) return;
  var x = 0, y = 0, queued = false;
  function paint() { queued = false; hot.style.setProperty("--mx", x + "px"); hot.style.setProperty("--my", y + "px"); }
  function near(e) {
    x = e.clientX; y = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(paint); }
    document.documentElement.classList.add("is-near");
  }
  addEventListener("pointermove", near, { passive: true });
  addEventListener("pointerdown", near, { passive: true });
  document.addEventListener("pointerleave", function () { document.documentElement.classList.remove("is-near"); });
  addEventListener("pointerup", function (e) {
    if (e.pointerType !== "mouse") setTimeout(function () { document.documentElement.classList.remove("is-near"); }, 900);
  });
})();
