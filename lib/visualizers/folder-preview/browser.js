/**
 * Folder Preview Visualizer — Runtime (browser.js)
 *
 * Fetches /graph.json and renders a list of pages belonging to the
 * current folder (detected from window.location.pathname).
 *
 * Settings (via code fence YAML, passed as data-fp-settings JSON):
 *   sort:  alpha (default) | reverse-alpha
 *   limit: max number of pages to show
 */

(function () {
  const containers = document.querySelectorAll(".folder-preview-visualizer");
  if (!containers.length) return;

  // Detect current folder from URL: /marbles/ → "marbles", /marbles/some-page/ → "marbles"
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const currentFolder = pathParts.length >= 1 ? pathParts[0] : null;
  if (!currentFolder) return;

  fetch("/graph.json")
    .then(function (res) { return res.json(); })
    .then(function (graph) {
      const allNodes = graph.nodes || [];

      containers.forEach(function (container) {
        let settings = {};
        try {
          settings = JSON.parse(container.dataset.fpSettings || "{}");
        } catch (e) {}

        const folder = settings.folder || currentFolder;
        const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
        const sort = settings.sort || "alpha";

        // Filter to pages in this folder (exclude the index page itself)
        let pages = allNodes.filter(function (node) {
          return (
            node.section === folder &&
            node.type === "page" &&
            node.id !== window.location.pathname
          );
        });

        // Sort
        pages.sort(function (a, b) {
          const ta = (a.title || "").toLowerCase();
          const tb = (b.title || "").toLowerCase();
          return sort === "reverse-alpha" ? tb.localeCompare(ta) : ta.localeCompare(tb);
        });

        if (isFinite(limit)) pages = pages.slice(0, limit);

        if (!pages.length) {
          const empty = document.createElement("p");
          empty.className = "folder-preview__empty";
          empty.textContent = "Nothing here yet.";
          container.appendChild(empty);
          return;
        }

        const ul = document.createElement("ul");
        ul.className = "folder-preview__list";

        pages.forEach(function (node) {
          const li = document.createElement("li");
          li.className = "folder-preview__item";

          const a = document.createElement("a");
          a.href = node.id;
          a.className = "folder-preview__link";

          // Bloob icon (if any)
          if (node.bloobIcon) {
            const icon = document.createElement("img");
            icon.src = node.bloobIcon;
            icon.className = "folder-preview__icon";
            icon.alt = "";
            icon.setAttribute("aria-hidden", "true");
            a.appendChild(icon);
          }

          const label = document.createElement("span");
          label.textContent = node.title || node.id;
          a.appendChild(label);

          li.appendChild(a);
          ul.appendChild(li);
        });

        container.appendChild(ul);
      });
    })
    .catch(function (err) {
      console.warn("[folder-preview] Failed to load graph.json:", err);
    });
})();
