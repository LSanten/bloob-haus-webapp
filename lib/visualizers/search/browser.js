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
    previewBody.innerHTML = '';
    previewOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    var loading = document.createElement('p');
    loading.className = 'sv-preview-loading';
    loading.textContent = 'Loading…';
    previewBody.appendChild(loading);

    // iframe hidden until loaded — setting innerHTML in onload would remove it from
    // the DOM and trigger a reload, causing the flicker the user sees.
    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;flex:1;min-height:0;border:none;display:none;';
    iframe.setAttribute('title', 'Page preview');
    iframe.onload = function () {
      loading.remove();
      iframe.style.display = 'block';
    };
    iframe.onerror = function () {
      loading.textContent = 'Could not load preview.';
    };
    previewBody.appendChild(iframe);
    iframe.src = url;
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

    // No PhotoSwipe → clicking the thumbnail just navigates to the page.
    // We only wire up the lightbox when bloobOpenLightbox is available (set by
    // photoswipe-scripts.njk after lightbox.init()). PhotoSwipe is loaded
    // asynchronously as an ES module so we defer the check to click time.
    thumb.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (typeof window.bloobOpenLightbox !== 'function') {
        window.open(url, '_blank');
        return;
      }

      // Fetch the target page and extract its image gallery.
      // Prefer <a class="pswp-gallery__item"> links (full-res href + dimensions).
      // Fall back to <img> elements inside the main content area.
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var items = [];

          var galleryLinks = Array.from(doc.querySelectorAll('a.pswp-gallery__item'));
          if (galleryLinks.length) {
            items = galleryLinks.map(function (a) {
              return {
                src:    a.getAttribute('href') || a.getAttribute('data-pswp-src') || '',
                w:      parseInt(a.getAttribute('data-pswp-width'))  || 0,
                h:      parseInt(a.getAttribute('data-pswp-height')) || 0,
                srcset: a.getAttribute('data-pswp-srcset') || '',
              };
            }).filter(function (item) { return item.src; });
          } else {
            // No gallery markup — collect <img>s from the content area.
            var contentArea = doc.querySelector(
              'article, .page-body, .marble-content, .page-content, main'
            ) || doc.body;
            var imgs = Array.from(contentArea.querySelectorAll('img[src]'));
            items = imgs
              .filter(function (img) {
                var src = img.getAttribute('src') || '';
                return src && !src.includes('/pagefind/') && !src.includes('favicon');
              })
              .map(function (img) {
                return { src: img.getAttribute('src'), w: 0, h: 0 };
              });
          }

          if (items.length) {
            window.bloobOpenLightbox(items, 0);
          } else {
            window.open(url, '_blank');
          }
        })
        .catch(function () { window.open(url, '_blank'); });
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


  // ─── Quiet search (style: quiet; bloob-haus-26 turns it on with html[data-search-style]) ──
  // The same Pagefind engine (full text, headings inside a page, tag filters, IDs), drawn as a
  // quiet list in the search's own ranking: each result with its object in miniature, what kind of
  // object it is (click to read what that kind is), its words lit, the headings that matched, and
  // a peek eye (always visible on touch screens).

  var PAGE_SIZE = 12;
  var PAGEFIND_JS = '/pagefind/pagefind.js';

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function litTitle(title, q) {
    var t = escHtml(title);
    var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
    words.forEach(function (w) {
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      t = t.replace(re, '<mark>$1</mark>');
    });
    return t;
  }
  // Pagefind's excerpt, without the haus's greeting line and without the page's ID (searchable,
  // but the result's own link already says where it is).
  function cleanExcerpt(html) {
    return String(html || '')
      .replace(/^\s*(?:(?:Here is an? [^.]{1,40} )?for )?you\.\s*/i, '')
      .replace(/\bID:\s*(?:<mark>[^<]*<\/mark>|[\w/.-])+(?:\s*(?:<mark>)?[A-Z0-9][A-Za-z0-9-]*(?:<\/mark>)?){0,8}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  var KIND_LABEL = { marble: 'Marble', note: 'Note', page: 'Page' };
  var ABOUT = null;
  function aboutKind(kind) {
    if (!ABOUT) {
      try { ABOUT = JSON.parse((document.getElementById('bloob-shape-about') || {}).textContent || '{}'); } catch (e) { ABOUT = {}; }
    }
    return ABOUT[kind] || (kind === 'page' ? 'A page of this haus.' : '');
  }
  function thumb(d) {
    var kind = (d.meta && d.meta.kind) || 'page';
    if (d.meta && d.meta.picture) return '<img class="sq-thumb sq-thumb--marble no-optimize" src="' + escHtml(d.meta.picture) + '" alt="" width="44" height="44" loading="lazy">';
    if (kind === 'note') return '<span class="sq-thumb sq-thumb--note" aria-hidden="true"></span>';
    if (d.meta && d.meta.image) return '<img class="sq-thumb sq-thumb--image no-optimize" src="' + escHtml(d.meta.image) + '" alt="" width="44" height="44" loading="lazy">';
    return '<span class="sq-thumb sq-thumb--page" aria-hidden="true"></span>';
  }
  function where(url) {
    var path = String(url).replace(/^https?:\/\/[^/]+/, '').replace(/^\/|\/$/g, '');
    return location.hostname + (path ? ' / ' + path.split('/').join(' / ') : '');
  }
  function itemHtml(d, q) {
    var title = (d.meta && d.meta.title) || d.url;
    var sub = d.meta && d.meta.subtitle ? '<div class="sq-subtitle">' + escHtml(d.meta.subtitle) + '</div>' : '';
    var kind = (d.meta && d.meta.kind) || 'page';
    var label = KIND_LABEL[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);
    var heads = (d.sub_results || []).filter(function (r) { return r.url !== d.url && r.title && r.title !== title; }).slice(0, 2)
      .map(function (r) { return '<li><a href="' + escHtml(r.url) + '">' + escHtml(r.title) + '</a></li>'; }).join('');
    return '<li class="sq-item">' +
      '<a class="sq-link" href="' + escHtml(d.url) + '">' + thumb(d) +
        '<span class="sq-text"><span class="sq-title">' + litTitle(title, q) + '</span>' + sub +
        '<span class="sq-excerpt">' + cleanExcerpt(d.excerpt) + '</span>' +
        '<span class="sq-where">' + escHtml(where(d.url)) + '</span></span></a>' +
      '<button type="button" class="sq-kind" aria-expanded="false" data-kind="' + escHtml(kind) + '">' + escHtml(label) + '</button>' +
      '<button type="button" class="bloob-peek-eye sq-eye" data-peek-url="' + escHtml(d.url) + '" aria-label="Peek at ' + escHtml(title) + '">' + EYE_SVG + '</button>' +
      (heads ? '<ul class="sq-sub">' + heads + '</ul>' : '') +
      '<p class="sq-about" hidden></p>' +
    '</li>';
  }

  function mountQuiet(container, opts) {
    container.classList.add('sq');
    container.innerHTML =
      '<form class="sq-field" role="search">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input class="sq-input" type="search" autocomplete="off" spellcheck="false" aria-label="Search" placeholder="' + escHtml(opts.placeholder) + '">' +
        '<kbd class="sq-kbd" aria-hidden="true">/</kbd>' +
      '</form>' +
      (opts.showTags ? '<div class="sq-chips" role="group" aria-label="Narrow by tag"></div>' : '') +
      '<p class="sq-status" aria-live="polite"></p><div class="sq-results"></div>';
    var input = container.querySelector('.sq-input');
    var status = container.querySelector('.sq-status');
    var results = container.querySelector('.sq-results');
    var chips = container.querySelector('.sq-chips');
    var tags = [];
    var pf = null;
    var hits = [];
    var token = 0;

    function engine() {
      // A variable, so the bundler leaves it alone: Pagefind's file only exists on the built site.
      if (!pf) pf = import(PAGEFIND_JS).then(function (m) { return Promise.resolve(m.init && m.init()).then(function () { return m; }); });
      return pf;
    }

    // One list in the search's own ranking: what fits best comes first, whatever its kind.
    var shown = PAGE_SIZE;
    function render(q) {
      if (!q) { results.innerHTML = ''; status.textContent = ''; return; }
      status.textContent = hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') + ' for "' + q + '"' : 'Nothing found for "' + q + '"';
      if (!hits.length) { results.innerHTML = ''; return; }
      results.innerHTML = '<ul class="sq-list">' + hits.slice(0, shown).map(function (d) { return itemHtml(d, q); }).join('') + '</ul>' +
        (hits.length > shown ? '<button type="button" class="sq-more">Show more</button>' : '');
    }

    function run() {
      var q = input.value.trim();
      var mine = ++token;
      if (!q) { hits = []; render(''); return; }
      engine().then(function (m) {
        var o = tags.length ? { filters: { tag: { any: tags } } } : {};
        return m.search(q, o);
      }).then(function (r) {
        if (mine !== token || !r) return;
        return Promise.all(r.results.slice(0, 120).map(function (x) { return x.data(); })).then(function (all) {
          if (mine !== token) return;
          hits = all; shown = PAGE_SIZE; render(q);
        });
      }).catch(function () { status.textContent = 'Search is not available right now.'; });
    }

    var timer = null;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 140); });
    container.querySelector('.sq-field').addEventListener('submit', function (e) {
      e.preventDefault();
      var first = results.querySelector('.sq-link');
      if (first) location.href = first.href;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; run(); }
    });
    results.addEventListener('click', function (e) {
      var eye = e.target.closest('.sq-eye');
      if (eye) {
        e.preventDefault();
        var url = eye.getAttribute('data-peek-url');
        var peek = window.BloobObjects && window.BloobObjects.peek;
        if (peek) peek(url).then(function (ok) { if (!ok) location.href = url; }, function () { location.href = url; });
        else location.href = url;
        return;
      }
      var kindBtn = e.target.closest('.sq-kind');
      if (kindBtn) {
        var about = kindBtn.closest('.sq-item').querySelector('.sq-about');
        var open = about.hidden;
        about.textContent = aboutKind(kindBtn.getAttribute('data-kind'));
        about.hidden = !open || !about.textContent;
        kindBtn.setAttribute('aria-expanded', String(!about.hidden));
        return;
      }
      if (e.target.closest('.sq-more')) { shown += PAGE_SIZE; render(input.value.trim()); }
    });
    if (chips) {
      engine().then(function (m) { return m.filters ? m.filters() : {}; }).then(function (f) {
        var counts = (f && f.tag) || {};
        var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 14);
        chips.innerHTML = names.map(function (n) { return '<button type="button" data-tag="' + escHtml(n) + '">' + escHtml(n) + '</button>'; }).join('');
      }).catch(function () {});
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-tag]');
        if (!b) return;
        var t = b.getAttribute('data-tag');
        var i = tags.indexOf(t);
        if (i < 0) tags.push(t); else tags.splice(i, 1);
        b.classList.toggle('on', i < 0);
        run();
      });
    }
    // "/" anywhere puts you in the search (not while typing somewhere else)
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      var a = document.activeElement;
      if (a && (a.isContentEditable || /^(input|textarea|select)$/i.test(a.tagName))) return;
      e.preventDefault();
      input.focus();
    });
    setTimeout(function () { engine().then(function (m) { return m.preload ? m.preload('') : null; }).catch(function () {}); }, 800);
  }

  // ─── Pagefind UI mounting ────────────────────────────────────────────────

  function styleOf(container) {
    try {
      var st = JSON.parse(container.dataset.searchSettings || '{}').style;
      if (st) return st;
    } catch (e) {}
    return document.documentElement.getAttribute('data-search-style') || 'pagefind';
  }

  function mountSearch() {
    var containers = document.querySelectorAll('.search-visualizer');
    containers.forEach(function (container, i) {
      if (styleOf(container) === 'quiet') return;
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
      // Visualizer-level settings consumed here; not passed to PagefindUI.
      var showId           = userSettings.show_id      !== undefined ? userSettings.show_id : 'always';
      var showActions      = userSettings.show_actions  !== undefined ? userSettings.show_actions : true;
      var userProcessResult = typeof userSettings.processResult === 'function' ? userSettings.processResult : null;
      delete userSettings.show_tags;
      delete userSettings.show_id;
      delete userSettings.show_actions;
      delete userSettings.processResult;

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
        processResult: function (r) {
          if (r.meta && r.meta.subtitle) {
            r.excerpt = '<span class="pagefind-subtitle">' + r.meta.subtitle + '</span>' + (r.excerpt || '');
          }
          return userProcessResult ? userProcessResult(r) : r;
        },
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

  // Quiet containers draw themselves; the Pagefind UI script is only loaded for the others.
  var all = document.querySelectorAll('.search-visualizer');
  var needsUi = false;
  all.forEach(function (c) {
    if (styleOf(c) !== 'quiet') { needsUi = true; return; }
    var st = {};
    try { st = JSON.parse(c.dataset.searchSettings || '{}'); } catch (e) {}
    mountQuiet(c, { placeholder: st.placeholder || 'Search…', showTags: !!st.show_tags });
  });
  if (!needsUi) return;
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
