/**
 * Search Visualizer — Runtime (browser.js)
 *
 * Mounts Pagefind UI into .search-visualizer containers placed by the
 * build-time transform (index.js).
 *
 * Standard defaults (same as warm-kitchen theme):
 *   - showSubResults: true
 *   - showImages: true
 *   - showEmptyFilters: false
 *   - openFilters: ['tag']
 *
 * Any setting can be overridden via the code fence YAML:
 *   ```search
 *   placeholder: Search my marbles...
 *   show_images: false
 *   ```
 *
 * `placeholder` is a shorthand for translations.placeholder.
 */

(function () {
  const containers = document.querySelectorAll(".search-visualizer");
  if (!containers.length) return;

  // CSS is loaded by the theme's head.njk (when features.search is on).
  // browser.js does not inject CSS — that's the theme's responsibility.

  function mountSearch() {
    containers.forEach(function (container, i) {
      const id = "search-widget-" + i;
      container.id = id;

      let userSettings = {};
      try {
        userSettings = JSON.parse(container.dataset.searchSettings || "{}");
      } catch (e) {}

      // `placeholder` shorthand → translations.placeholder
      const placeholder = userSettings.placeholder || "Search...";
      delete userSettings.placeholder;

      // `show_tags: true` → reveal filter panel via CSS class; not a PagefindUI option
      if (userSettings.show_tags) {
        container.classList.add("search-visualizer--show-tags");
      }
      delete userSettings.show_tags;

      const defaults = {
        showSubResults: true,
        showImages: true,
        showEmptyFilters: false,
        resetStyles: false,
        translations: {
          placeholder: placeholder,
          zero_results: 'No results for "[SEARCH_TERM]"',
        },
      };

      new PagefindUI({
        element: "#" + id,
        ...defaults,
        ...userSettings,
        // Deep-merge translations so a partial override works
        translations: {
          ...defaults.translations,
          ...(userSettings.translations || {}),
        },
      });
    });
  }

  // CSS is in head.njk. JS loads dynamically — only on pages with a search widget.
  if (window.PagefindUI) {
    mountSearch();
  } else {
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = mountSearch;
    document.head.appendChild(script);
  }
})();
