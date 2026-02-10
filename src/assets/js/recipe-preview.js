/**
 * Recipe Preview Modal
 * Intercepts recipe/note link clicks to show a scrollable preview modal
 * instead of navigating away. Works on recipe cards, tag pages, and search results.
 */
(function () {
  // Selectors for links that should open in the preview modal
  var PREVIEW_SELECTORS = [
    ".recipe-card-link", // Recipe cards on list pages and homepage
    ".tag-page-list a", // Links on individual tag pages
    ".pagefind-ui__result-link", // Pagefind search result links
  ].join(",");

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

        // Try to extract just the recipe/page content
        var recipe = doc.querySelector(".recipe-content");
        if (recipe) {
          content.innerHTML = recipe.innerHTML;
        } else {
          var main = doc.querySelector(".site-main");
          if (main) {
            content.innerHTML = main.innerHTML;
          } else {
            content.innerHTML = "<p>Could not load preview.</p>";
          }
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

  // Close on overlay click (outside modal)
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closePreview();
    }
  });

  // Close button
  closeBtn.addEventListener("click", closePreview);

  // Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      closePreview();
    }
  });

  // Intercept clicks on any matching link
  document.addEventListener("click", function (e) {
    var link = e.target.closest(PREVIEW_SELECTORS);
    if (!link) return;

    // Get the href — could be on the element itself or a child <a>
    var url = link.getAttribute("href");
    if (!url) {
      var innerLink = link.querySelector("a");
      if (innerLink) url = innerLink.getAttribute("href");
    }

    // Only intercept internal content links (not tag pages, not external)
    if (!url || !url.startsWith("/")) return;
    if (url.startsWith("/tags/") || url.startsWith("/search/")) return;

    e.preventDefault();
    openPreview(url);
  });
})();
