/**
 * Search Visualizer — Runtime (browser.js)
 *
 * Mounts Pagefind UI into .search-visualizer containers placed by the
 * build-time transform (index.js), then enhances each rendered result with:
 *   - ID slug line   (.pagefind-ui__result-id)   — extracted from the link href
 *   - Action buttons (.pagefind-ui__result-actions) — eye preview + copy link
 *   - Thumbnail click → image lightbox via window.bloobOpenLightbox() if the
 *     theme exposes it (PhotoSwipe), otherwise opens the page in a new tab.
 *
 * Code fence syntax (all settings optional):
 *   ```search
 *   placeholder: Search our resources...
 *   show_tags: false
 *   show_id: always | never          (default: always)
 *   show_actions: true | false       (default: true)
 *   ```
 *
 * Lightbox integration:
 *   If window.bloobOpenLightbox(items, startIndex) is defined (PhotoSwipe
 *   exposed by the theme's scripts.njk), clicking a result thumbnail fetches
 *   the target page, extracts its gallery links (a.pswp-gallery__item), and
 *   opens the same slideshow the user sees when viewing that page directly.
 *   Themes without PhotoSwipe fall back to opening the page in a new tab.
 */

(function () {

  // ─── SVG icons ───────────────────────────────────────────────────────────

  var EYE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var LINK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

  // ─── Preview modal ────────────────────────────────────────────────────────

  var previewOverlay = null;
  var previewBody = null;
  var previewGoto = null;

  function createPreviewModal() {
    if (previewOverlay) return;
    previewOverlay = document.createElement('div');
    previewOverlay.className = 'sv-preview-overlay';
    previewOverlay.innerHTML =
      '<div class="sv-preview-modal">' +
        '<div class="sv-preview-header">' +
          '<a class="sv-preview-goto" href="#" target="_blank">Open page →</a>' +
          '<button class="sv-preview-close" aria-label="Close preview">×</button>' +
        '</div>' +
        '<div class="sv-preview-body"></div>' +
      '</div>';
    document.body.appendChild(previewOverlay);

    previewBody = previewOverlay.querySelector('.sv-preview-body');
    previewGoto = previewOverlay.querySelector('.sv-preview-goto');

    previewOverlay.addEventListener('click', function (e) {
      if (e.target === previewOverlay) closePreview();
    });
    previewOverlay.querySelector('.sv-preview-close').addEventListener('click', closePreview);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && previewOverlay.classList.contains('active')) closePreview();
    });
  }

  function openPreview(url) {
    createPreviewModal();
    previewGoto.href = url;
    // Use an iframe so the page loads fully with JS — visualizers, galleries, etc.
    // The previous fetch+innerHTML approach stripped JS so visualizers never rendered.
    previewBody.innerHTML = '<p class="sv-preview-loading">Loading…</p>';
    previewOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    iframe.setAttribute('title', 'Page preview');
    iframe.onload = function () {
      previewBody.innerHTML = '';
      previewBody.appendChild(iframe);
    };
    iframe.onerror = function () {
      previewBody.innerHTML = '<p>Could not load preview.</p>';
    };
    // Append offscreen first so it starts loading immediately
    previewBody.appendChild(iframe);
  }

  function closePreview() {
    if (!previewOverlay) return;
    previewOverlay.classList.remove('active');
    document.body.style.overflow = '';
    previewBody.innerHTML = '';
  }

  // ─── Result enhancement helpers ──────────────────────────────────────────

  function injectIdLine(result, settings) {
    if (settings.show_id === 'never') return;
    if (result.querySelector('.pagefind-ui__result-id')) return;

    var link = result.querySelector('.pagefind-ui__result-link');
    if (!link) return;

    // Prefer the "ID: X" body text (includes trailing / for folder pages)
    // over the href (which strips trailing slashes).
    var slug = '';
    var excerptEl = result.querySelector('.pagefind-ui__result-excerpt');
    if (excerptEl) {
      var m = excerptEl.textContent.match(/\bID:\s*([\w/.-]+)/);
      if (m) slug = m[1];
    }
    if (!slug) slug = (link.getAttribute('href') || '').replace(/^\/|\/$/g, '');
    if (!slug) return;

    var el = document.createElement('div');
    el.className = 'pagefind-ui__result-id';
    el.innerHTML = '<span class="sv-id-pill"><span class="sv-id-pill-label">ID</span>' + slug + '</span>';

    var inner = result.querySelector('.pagefind-ui__result-inner');
    if (inner) inner.appendChild(el);
  }

  function injectActions(result, settings) {
    if (settings.show_actions === false) return;
    if (result.querySelector('.pagefind-ui__result-actions')) return;

    var link = result.querySelector('.pagefind-ui__result-link');
    if (!link) return;
    var url = link.getAttribute('href');
    if (!url || !url.startsWith('/')) return;

    var actions = document.createElement('div');
    actions.className = 'pagefind-ui__result-actions';

    // Eye / preview button
    var eyeBtn = document.createElement('button');
    eyeBtn.className = 'pagefind-ui__result-action sv-preview-btn';
    eyeBtn.setAttribute('aria-label', 'Preview page');
    eyeBtn.setAttribute('title', 'Preview');
    eyeBtn.innerHTML = EYE_SVG;
    eyeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPreview(url);
    });

    // Copy link button
    var copyBtn = document.createElement('button');
    copyBtn.className = 'pagefind-ui__result-action sv-copy-btn';
    copyBtn.setAttribute('aria-label', 'Copy link');
    copyBtn.setAttribute('title', 'Copy link');
    copyBtn.innerHTML = LINK_SVG;
    copyBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var abs = window.location.origin + url;
      navigator.clipboard.writeText(abs).then(function () {
        actions.setAttribute('data-copied', 'true');
        setTimeout(function () { actions.removeAttribute('data-copied'); }, 1500);
      });
    });

    actions.appendChild(eyeBtn);
    actions.appendChild(copyBtn);

    var inner = result.querySelector('.pagefind-ui__result-inner');
    if (inner) inner.appendChild(actions);
  }

  function wireThumbnailClick(result) {
    var thumb = result.querySelector('.pagefind-ui__result-thumb');
    if (!thumb || thumb.dataset.wired) return;
    thumb.dataset.wired = 'true';

    var link = result.querySelector('.pagefind-ui__result-link');
    var url = link ? link.getAttribute('href') : null;
    if (!url) return;

    thumb.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      // If the theme exposes window.bloobOpenLightbox (PhotoSwipe), fetch the
      // target page's gallery links and open the same slideshow as the page itself.
      // Otherwise, open the page in a new tab.
      if (typeof window.bloobOpenLightbox === 'function') {
        fetch(url)
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var links = Array.from(doc.querySelectorAll('a.pswp-gallery__item'));
            if (links.length) {
              var items = links.map(function (a) {
                return {
                  src:    a.getAttribute('data-pswp-src') || a.getAttribute('href'),
                  w:      parseInt(a.getAttribute('data-pswp-width'))  || 0,
                  h:      parseInt(a.getAttribute('data-pswp-height')) || 0,
                  srcset: a.getAttribute('data-pswp-srcset') || '',
                };
              });
              window.bloobOpenLightbox(items, 0);
            } else {
              window.open(url, '_blank');
            }
          })
          .catch(function () { window.open(url, '_blank'); });
      } else {
        window.open(url, '_blank');
      }
    });
  }

  // Wrap the input + Pagefind's clear button in a positioned div so the clear
  // button's position:absolute is contained by the input area, not the full
  // form (which also wraps the entire results drawer).
  // Called ONCE via requestAnimationFrame after PagefindUI renders — never from
  // the MutationObserver, because moving a focused element causes it to lose focus.
  function wrapInputClear(container) {
    var input = container.querySelector('.pagefind-ui__search-input');
    if (!input) return;
    if (input.parentElement && input.parentElement.classList.contains('sv-input-wrapper')) return;
    var clearBtn = container.querySelector('.pagefind-ui__search-clear');
    if (!clearBtn) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'sv-input-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(clearBtn);
  }

  // Transform "ID: slug/" or "ID: slug" in the excerpt into a styled pill.
  // Pagefind may wrap matched characters in <mark> — the regex handles that.
  function processExcerptId(result) {
    var excerpt = result.querySelector('.pagefind-ui__result-excerpt');
    if (!excerpt) return;
    var html = excerpt.innerHTML;
    var updated = html.replace(
      /\bID:\s*((?:<mark>[^<]*<\/mark>|[\w/.-])+)/g,
      '<span class="sv-id-pill"><span class="sv-id-pill-label">ID</span>$1</span>'
    );
    if (updated !== html) excerpt.innerHTML = updated;
  }

  function enhanceResults(container, settings) {
    container.querySelectorAll('.pagefind-ui__result').forEach(function (result) {
      injectIdLine(result, settings);
      injectActions(result, settings);
      wireThumbnailClick(result);
      processExcerptId(result);
    });
  }

  // ─── Pagefind UI mounting ────────────────────────────────────────────────

  function mountSearch() {
    var containers = document.querySelectorAll('.search-visualizer');
    containers.forEach(function (container, i) {
      var id = 'search-widget-' + i;
      container.id = id;

      var userSettings = {};
      try {
        userSettings = JSON.parse(container.dataset.searchSettings || '{}');
      } catch (e) {}

      var placeholder = userSettings.placeholder || 'Search…';
      delete userSettings.placeholder;

      if (userSettings.show_tags) {
        container.classList.add('search-visualizer--show-tags');
      }
      // These are visualizer-level settings consumed above; not passed to PagefindUI.
      var showId      = userSettings.show_id      !== undefined ? userSettings.show_id : 'always';
      var showActions = userSettings.show_actions  !== undefined ? userSettings.show_actions : true;
      delete userSettings.show_tags;
      delete userSettings.show_id;
      delete userSettings.show_actions;

      var settings = { show_id: showId, show_actions: showActions };

      new PagefindUI({
        element: '#' + id,
        showSubResults: true,
        showImages: true,
        showEmptyFilters: false,
        resetStyles: false,
        translations: {
          placeholder: placeholder,
          zero_results: 'No results for "[SEARCH_TERM]"',
          one_result: '[COUNT] result for "[SEARCH_TERM]"',
          many_results: '[COUNT] results for "[SEARCH_TERM]"',
        },
        ...userSettings,
      });

      // Wrap input + clear button once, after Svelte's initial render.
      // Must NOT be called from the MutationObserver — moving a focused element
      // via DOM manipulation causes it to lose focus (requires a second click).
      requestAnimationFrame(function () { wrapInputClear(container); });

      // Watch this container for dynamically rendered results and enhance them.
      var observer = new MutationObserver(function () {
        enhanceResults(container, settings);
      });
      observer.observe(container, { childList: true, subtree: true });
    });
  }

  // ─── Pagefind WASM pre-warm ──────────────────────────────────────────────
  // Pagefind lazy-loads and JIT-compiles its WASM engine on the first search.
  // On macOS/Safari this compile blocks the main thread for ~100-200ms and
  // can cause a black-frame flash. We trigger it silently in the background
  // 800ms after the UI mounts — before the user has typed anything.
  function prewarmPagefind() {
    if (document.querySelector('script[data-pagefind-prewarm]')) return;
    var s = document.createElement('script');
    s.type = 'module';
    s.dataset.pagefindPrewarm = '';
    // Imports pagefind.js (already cached by PagefindUI's own load) and
    // calls preload() or init() to trigger WASM compilation now.
    s.textContent =
      'import("/pagefind/pagefind.js")' +
      '.then(function(pf){return pf.preload?pf.preload():pf.init?pf.init():null})' +
      '.catch(function(){});';
    document.head.appendChild(s);
  }

  if (window.PagefindUI) {
    mountSearch();
    setTimeout(prewarmPagefind, 800);
  } else {
    var script = document.createElement('script');
    script.src = '/pagefind/pagefind-ui.js';
    script.onload = function () { mountSearch(); setTimeout(prewarmPagefind, 800); };
    document.head.appendChild(script);
  }

})();
