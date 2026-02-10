/**
 * Recipe Preview Modal
 * Intercepts recipe card clicks to show a scrollable preview modal
 * instead of navigating away. Works on all pages with recipe cards.
 */
(function () {
  // Create modal elements once
  var overlay = document.createElement('div');
  overlay.className = 'preview-overlay';
  overlay.innerHTML =
    '<div class="preview-modal">' +
      '<button class="preview-close" aria-label="Close preview">&times;</button>' +
      '<div class="preview-content"></div>' +
      '<a class="preview-goto" href="#">Go to recipe</a>' +
    '</div>';
  document.body.appendChild(overlay);

  var modal = overlay.querySelector('.preview-modal');
  var content = overlay.querySelector('.preview-content');
  var gotoBtn = overlay.querySelector('.preview-goto');
  var closeBtn = overlay.querySelector('.preview-close');
  var currentUrl = '';

  function openPreview(url, title) {
    currentUrl = url;
    gotoBtn.href = url;
    content.innerHTML = '<p class="preview-loading">Loading...</p>';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        // Parse the fetched page and extract the recipe content
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var recipe = doc.querySelector('.recipe-content');
        if (recipe) {
          content.innerHTML = recipe.innerHTML;
        } else {
          // Fallback: try to get the main content
          var main = doc.querySelector('.site-main');
          if (main) {
            content.innerHTML = main.innerHTML;
          } else {
            content.innerHTML = '<p>Could not load preview.</p>';
          }
        }
        modal.scrollTop = 0;
      })
      .catch(function () {
        content.innerHTML = '<p>Could not load preview.</p>';
      });
  }

  function closePreview() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    content.innerHTML = '';
  }

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closePreview();
    }
  });

  // Close button
  closeBtn.addEventListener('click', closePreview);

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePreview();
    }
  });

  // Intercept recipe card clicks
  document.addEventListener('click', function (e) {
    var link = e.target.closest('.recipe-card-link');
    if (!link) return;

    var url = link.getAttribute('href');
    // Only intercept internal recipe/note links
    if (!url || !url.startsWith('/')) return;

    e.preventDefault();
    var title = link.querySelector('.recipe-summary');
    openPreview(url, title ? title.textContent.trim() : '');
  });
})();
