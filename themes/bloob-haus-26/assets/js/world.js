// The background's dots clear away near the cursor or a finger: a clear spot to look through. The position is written only to the world layer, once per frame.
// Also: the visitor's day/night choice (auto, day, night), kept in their browser.
(function () {
  var world = document.querySelector(".world");
  var html = document.documentElement;
  if (world) {
    var x = 0, y = 0, queued = false;
    var paint = function () { queued = false; world.style.setProperty("--mx", x + "px"); world.style.setProperty("--my", y + "px"); };
    var near = function (e) {
      x = e.clientX; y = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
      html.classList.add("is-near");
    };
    addEventListener("pointermove", near, { passive: true });
    addEventListener("pointerdown", near, { passive: true });
    document.addEventListener("pointerleave", function () { html.classList.remove("is-near"); });
    addEventListener("pointerup", function (e) {
      if (e.pointerType !== "mouse") setTimeout(function () { html.classList.remove("is-near"); }, 900);
    });
  }

  var buttons = document.querySelectorAll("[data-sky-choice]");
  var show = function () {
    var sky = html.getAttribute("data-sky") || "auto";
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.skyChoice === sky)); });
  };
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      var choice = b.dataset.skyChoice;
      try { choice === "auto" ? localStorage.removeItem("bh-sky") : localStorage.setItem("bh-sky", choice); } catch (e) {}
      if (choice === "auto") html.removeAttribute("data-sky"); else html.setAttribute("data-sky", choice);
      show();
    });
  });
  show();
})();
