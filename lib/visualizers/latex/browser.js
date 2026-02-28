/**
 * LaTeX visualizer — browser runtime
 *
 * Loads KaTeX from CDN and runs auto-render on DOMContentLoaded.
 * Supports $...$ (inline) and $$...$$ (block) math.
 */
(function () {
  function loadScript(src, onload) {
    var s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.onload = onload;
    document.head.appendChild(s);
  }

  function runKatex() {
    loadScript(
      "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
      function () {
        renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
        });
      }
    );
  }

  // Load KaTeX core, then auto-render
  loadScript(
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
    runKatex
  );
})();
