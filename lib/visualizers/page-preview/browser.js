/**
 * Page Preview Visualizer — Browser Runtime
 *
 * Side effects: DOM manipulation, fetch.
 * This is the only file that touches the DOM or browser APIs.
 *
 * Adds a "preview" button to content links across the site.
 * Clicking the button opens a scrollable modal with the page content.
 * The original link still works normally for navigation.
 *
 * Targets:
 * - .recipe-card-link (homepage, list pages)
 * - .tag-page-list li (tag pages)
 * - .pagefind-ui__result (search results, added dynamically)
 */
(function () {
  // SVG eye icon for the preview button
  var EYE_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  // Create modal elements once
  var overlay = document.createElement("div");
  overlay.className = "preview-overlay";
  overlay.innerHTML =
    '<div class="preview-modal">' +
    '<button class="preview-close" aria-label="Close preview">&times;</button>' +
    '<div class="preview-content"></div>' +
    '<a class="preview-goto" href="#">Go to page</a>' +
    "</div>";
  document.body.appendChild(overlay);

  var modal = overlay.querySelector(".preview-modal");
  var content = overlay.querySelector(".preview-content");
  var gotoBtn = overlay.querySelector(".preview-goto");
  var closeBtn = overlay.querySelector(".preview-close");

  function openPreview(url) {
    gotoBtn.href = url;
    content.innerHTML = '<p class="preview-loading">Loading...</p>';
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    fetch(url)
      .then(function (res) {
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
        var recipe = doc.querySelector(".recipe-content");
        if (recipe) {
          content.innerHTML = recipe.innerHTML;
        } else {
          var main = doc.querySelector(".site-main");
          content.innerHTML = main
            ? main.innerHTML
            : "<p>Could not load preview.</p>";
        }
        modal.scrollTop = 0;
      })
      .catch(function () {
        content.innerHTML = "<p>Could not load preview.</p>";
      });
  }

  function closePreview() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    content.innerHTML = "";
  }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closePreview();
  });
  closeBtn.addEventListener("click", closePreview);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("active"))
      closePreview();
  });

  /**
   * Create a preview button element
   */
  function createPreviewBtn(url) {
    var btn = document.createElement("button");
    btn.className = "preview-btn";
    btn.setAttribute("aria-label", "Preview");
    btn.setAttribute("data-preview-url", url);
    btn.innerHTML = EYE_ICON;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPreview(url);
    });
    return btn;
  }

  /**
   * Add preview buttons to static content (recipe cards, tag page lists)
   */
  function addButtonsToStatic() {
    // Recipe cards on list pages and homepage
    document.querySelectorAll(".recipe-card-link").forEach(function (link) {
      var url = link.getAttribute("href");
      if (
        !url ||
        !url.startsWith("/") ||
        url.startsWith("/tags/") ||
        url.startsWith("/search/")
      )
        return;
      if (link.querySelector(".preview-btn")) return;
      var card = link.querySelector(".recipe-card");
      if (card) {
        card.style.position = "relative";
        card.appendChild(createPreviewBtn(url));
      }
    });

    // Tag page lists
    document.querySelectorAll(".tag-page-list li").forEach(function (li) {
      var link = li.querySelector("a");
      if (!link) return;
      var url = link.getAttribute("href");
      if (
        !url ||
        !url.startsWith("/") ||
        url.startsWith("/tags/") ||
        url.startsWith("/search/")
      )
        return;
      if (li.querySelector(".preview-btn")) return;
      li.style.position = "relative";
      li.appendChild(createPreviewBtn(url));
    });
  }

  /**
   * Add preview buttons to Pagefind search results (dynamically rendered)
   */
  function addButtonsToSearchResults() {
    document
      .querySelectorAll(".pagefind-ui__result")
      .forEach(function (result) {
        if (result.querySelector(".preview-btn")) return;
        var link = result.querySelector(".pagefind-ui__result-link");
        if (!link) return;
        var url = link.getAttribute("href");
        if (
          !url ||
          !url.startsWith("/") ||
          url.startsWith("/tags/") ||
          url.startsWith("/search/")
        )
          return;
        var inner = result.querySelector(".pagefind-ui__result-inner");
        if (inner) {
          inner.style.position = "relative";
          inner.appendChild(createPreviewBtn(url));
        }
      });
  }

  // Add buttons on page load
  addButtonsToStatic();

  // Watch for dynamically added search results
  var searchEl = document.getElementById("search");
  if (searchEl) {
    var observer = new MutationObserver(function () {
      addButtonsToSearchResults();
    });
    observer.observe(searchEl, { childList: true, subtree: true });
  }
})();
