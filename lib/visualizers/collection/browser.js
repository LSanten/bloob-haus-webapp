/**
 * Collection Visualizer — Runtime (browser.js)
 *
 * For containers where cards are pre-rendered at build time (SEO mode):
 *   - Detects .fp-seo-wrapper already in DOM and wires the search input only.
 *
 * For runtime containers (no pre-rendered content):
 *   - Fetches /graph.json and renders using the display mode from settings.
 *
 * Imports render-card.js and core.js — esbuild bundles them into this IIFE.
 */

import { resolvePages, parseSource } from "./core.js";
import { renderCardHtml, parseShowFields } from "./render-card.js";

(function () {
  const containers = document.querySelectorAll(".collection-visualizer");
  if (!containers.length) return;

  // Attach text search to pre-rendered card containers
  function attachSearch(container) {
    var input = container.querySelector(".fp-search-input");
    var cards = container.querySelectorAll(".fp-card");
    if (!input || !cards.length) return;
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().replace(/-/g, " ").trim();
      cards.forEach(function (card) {
        var haystack = (card.textContent + " " + (card.dataset.fpTags || ""))
          .toLowerCase()
          .replace(/-/g, " ");
        card.hidden = q ? !haystack.includes(q) : false;
      });
    });
  }

  // ── Pagefind full-text search ──────────────────────────────────────────────

  // Singleton: undefined = not yet tried, null = unavailable, object = ready
  var pfInstance;

  function initPagefind() {
    if (pfInstance !== undefined) return Promise.resolve(pfInstance);
    return import("/pagefind/pagefind.js")
      .then(function (pf) { return pf.init().then(function () { return pf; }); })
      .then(function (pf) { pfInstance = pf; return pf; })
      .catch(function (e) {
        console.warn("[collection] Pagefind not available — falling back to metadata search:", e.message);
        pfInstance = null;
        return null;
      });
  }

  function buildPagefindFilters(source) {
    var src = parseSource(source || "");
    if (src.type === "folder" && src.value) return { section: src.value };
    if (src.type === "tag"    && src.value) return { tag: src.value };
    return null;
  }

  function attachFulltextSearch(container, settings) {
    var input = container.querySelector(".fp-search-input");
    var cards = Array.from(container.querySelectorAll(".fp-card"));
    if (!input || !cards.length) return;

    var pending = "";

    input.addEventListener("input", function () {
      var q = input.value.trim();
      pending = q;

      if (!q) {
        cards.forEach(function (c) { c.hidden = false; });
        return;
      }

      initPagefind().then(function (pf) {
        if (pending !== q) return;
        if (!pf) {
          // Pagefind unavailable — fall back to metadata search
          var norm = q.toLowerCase().replace(/-/g, " ");
          cards.forEach(function (c) {
            var hay = (c.textContent + " " + (c.dataset.fpTags || "")).toLowerCase().replace(/-/g, " ");
            c.hidden = !hay.includes(norm);
          });
          return;
        }
        var filters = buildPagefindFilters(settings.source);
        return pf.search(q, filters ? { filters: filters } : {}).then(function (results) {
          if (pending !== q) return;
          return Promise.all(results.results.map(function (r) { return r.data(); }))
            .then(function (data) {
              if (pending !== q) return;
              var urls = new Set(data.map(function (d) { return d.url; }));
              cards.forEach(function (c) {
                c.hidden = !urls.has(c.getAttribute("href") || "");
              });
            });
        });
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────

  var runtimeContainers = [];
  containers.forEach(function (container) {
    var settings = {};
    try { settings = JSON.parse(container.dataset.collectionSettings || "{}"); } catch (e) {}

    // SEO mode: cards already in DOM — wire search only, skip graph.json fetch
    if (container.querySelector(".fp-seo-wrapper")) {
      if (settings.search === "fulltext") {
        attachFulltextSearch(container, settings);
      } else {
        attachSearch(container);
      }
    } else {
      runtimeContainers.push({ container: container, settings: settings });
    }
  });

  if (!runtimeContainers.length) return;

  // Fallback folder from URL path (for folder index pages)
  var pathParts = window.location.pathname.split("/").filter(Boolean);
  var currentFolder = pathParts.length >= 1 ? pathParts[0] : null;

  fetch("/graph.json")
    .then(function (res) { return res.json(); })
    .then(function (graph) {
      var allNodes = graph.nodes || [];

      runtimeContainers.forEach(function (item) {
        var container = item.container;
        var settings = item.settings;

        // For folder source without explicit folder=, fall back to current URL folder
        if (!settings.source && currentFolder) {
          settings = Object.assign({}, settings, { source: "folder=" + currentFolder });
        }

        var pages = resolvePages(allNodes, settings);
        // Exclude current page from runtime renders
        pages = pages.filter(function (n) { return n.id !== window.location.pathname; });

        var display = settings.display || "cards";

        if (display === "slider") {
          renderSliderCards(container, pages, settings);
        } else if (display === "bubbles") {
          renderBubbles(container, pages);
        } else if (display === "marbles") {
          renderMarbles(container, pages);
        } else if (display === "list") {
          renderList(container, pages);
        } else {
          renderCards(container, pages, settings);
        }
      });
    })
    .catch(function (err) {
      console.warn("[collection] Failed to load graph.json:", err);
    });

  // ── Display renderers ────────────────────────────────────────────────────

  function renderCards(container, pages, settings) {
    if (!pages.length) {
      container.innerHTML = '<p class="collection__empty">Nothing here yet.</p>';
      return;
    }

    var showFields = parseShowFields(settings.show_fields);
    var searchDisabled = settings.search === "off" || settings.search === false;

    var grid = document.createElement("div");
    grid.className = "fp-cards";

    pages.forEach(function (node) {
      var wrapper = document.createElement("div");
      wrapper.innerHTML = renderCardHtml(node, { showFields: showFields });
      var card = wrapper.firstElementChild;
      if (card) grid.appendChild(card);
    });

    var wrapper = document.createElement("div");
    wrapper.className = "fp-seo-wrapper";

    if (!searchDisabled) {
      var input = document.createElement("input");
      input.type = "text";
      input.className = "fp-search-input";
      input.placeholder = "Search...";
      input.setAttribute("aria-label", "Search");
      wrapper.appendChild(input);
      var filterDiv = document.createElement("div");
      filterDiv.className = "fp-filter-placeholder";
      wrapper.appendChild(filterDiv);
    }

    wrapper.appendChild(grid);
    container.appendChild(wrapper);

    if (!searchDisabled) {
      if (settings.search === "fulltext") {
        attachFulltextSearch(container, settings);
      } else {
        attachSearch(container);
      }
    }
  }

  function renderList(container, pages) {
    if (!pages.length) {
      container.innerHTML = '<p class="collection__empty">Nothing here yet.</p>';
      return;
    }

    var ul = document.createElement("ul");
    ul.className = "folder-preview__list";

    pages.forEach(function (node) {
      var li = document.createElement("li");
      li.className = "folder-preview__item";

      var a = document.createElement("a");
      a.href = node.redirect || node.id;
      a.className = "folder-preview__link";
      if (node.redirect) { a.target = "_blank"; a.rel = "noopener"; }

      if (node.bloobIcon) {
        var icon = document.createElement("img");
        icon.src = node.bloobIcon;
        icon.className = "folder-preview__icon";
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        a.appendChild(icon);
      }

      var label = document.createElement("span");
      label.textContent = node.title || node.id;
      a.appendChild(label);

      li.appendChild(a);
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  function renderSliderCards(container, pages, settings) {
    var title = settings.title || "ARTICLES";

    if (!pages.length) {
      container.innerHTML = '<p class="collection__empty">No articles yet.</p>';
      return;
    }

    var slides = pages.map(function (node) {
      var href = node.redirect || node.id;
      var externalAttr = node.redirect ? ' target="_blank" rel="noopener"' : "";
      var imgHtml = node.image
        ? `<a href="${href}"${externalAttr}><img class="articles__image" src="${node.image}" alt="${node.title || ""}" loading="lazy"></a>`
        : `<div class="articles__image articles__image--placeholder"></div>`;
      return `<div class="swiper-slide articles__content">
          ${imgHtml}
          <div class="articles__inner-content">
            <h3 class="articles__title">${node.title || ""}</h3>
          </div>
          <a href="${href}" class="articles__read-more button-1"${externalAttr}>READ MORE</a>
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="articles__top-section">
        <p class="label">${title}</p>
        <div class="swiper-nav">
          <div class="articles__prev-button"></div>
          <div class="articles__next-button"></div>
        </div>
      </div>
      <div class="swiper articles__repeater" id="articles-swiper">
        <div class="swiper-wrapper">${slides}</div>
      </div>`;

    function initSwiper() {
      if (typeof Swiper === "undefined") return;
      new Swiper("#articles-swiper", {
        grabCursor: true,
        speed: 500,
        spaceBetween: 10,
        loop: pages.length > 1,
        slidesPerView: 1.6,
        navigation: { nextEl: ".articles__next-button", prevEl: ".articles__prev-button" },
        breakpoints: {
          768:  { slidesPerView: 1.63, spaceBetween: 20 },
          1366: { slidesPerView: 2.46, spaceBetween: 130 },
          2560: { slidesPerView: 2.45, spaceBetween: 248 },
        },
      });
    }

    if (document.readyState === "complete") initSwiper();
    else window.addEventListener("load", initSwiper);
  }

  function renderBubbles(container, pages) {
    if (!pages.length) {
      container.innerHTML = '<p class="collection__empty">Nothing here yet.</p>';
      return;
    }

    var wrapper = document.createElement("div");
    wrapper.className = "fp-bubbles";
    var sizes = [140, 120, 155, 125, 140, 115, 150, 130];

    pages.forEach(function (node, i) {
      var size = sizes[i % sizes.length];
      var a = document.createElement("a");
      a.href = node.id;
      a.className = "fp-bubble";
      a.style.width = size + "px";
      a.style.height = size + "px";
      if (i % 2 === 1) a.style.marginTop = "40px";

      if (node.content_type) {
        var type = document.createElement("span");
        type.className = "fp-bubble__type";
        type.textContent = node.content_type;
        a.appendChild(type);
      }

      var titleEl = document.createElement("span");
      titleEl.className = "fp-bubble__title";
      titleEl.textContent = node.title || node.id;
      a.appendChild(titleEl);

      wrapper.appendChild(a);
    });

    container.appendChild(wrapper);
  }

  function renderMarbles(container, pages) {
    if (!pages.length) {
      container.innerHTML = '<p class="collection__empty">Nothing here yet.</p>';
      return;
    }

    var wrapper = document.createElement("div");
    wrapper.className = "fp-marbles";
    var sizes = [150, 130, 160, 125, 145, 135, 155, 128];
    var states = [];

    pages.forEach(function (node, i) {
      var size = sizes[i % sizes.length];
      var a = document.createElement("a");
      a.href = node.id;
      a.className = "fp-marble";
      a.style.width = size + "px";
      a.style.height = size + "px";
      a.style.transition = "none";
      if (i % 2 === 1) a.style.marginTop = "36px";

      var img = document.createElement("img");
      img.src = "/assets/objects/marble.png";
      img.className = "fp-marble__img";
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      a.appendChild(img);

      var titleEl = document.createElement("span");
      titleEl.className = "fp-marble__title";
      titleEl.textContent = node.title || node.id;
      a.appendChild(titleEl);

      wrapper.appendChild(a);
      states.push({
        el: a, imgEl: img, size: size,
        ox: 0, oy: 0,
        floatX: 0, floatY: 0,
        floatPhaseX: Math.random() * Math.PI * 2,
        floatPhaseY: Math.random() * Math.PI * 2,
        floatFreqX: 0.28 + Math.random() * 0.22,
        floatFreqY: 0.22 + Math.random() * 0.20,
        scale: 1,
        mode: "idle",
        wasDragged: false,
      });
    });

    container.appendChild(wrapper);

    var SPRING = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
    var FLOAT_AMP = 4;
    var NATURAL_HIGHLIGHT_DEG = -30;

    function applyTransform(s) {
      s.el.style.transform =
        "translate(" + (s.ox + s.floatX) + "px," + (s.oy + s.floatY) + "px) scale(" + s.scale + ")";
    }

    function getCenter(s) {
      var r = s.el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
    }

    function resolveCollisions(dragged) {
      for (var pass = 0; pass < 5; pass++) {
        if (dragged) {
          var dc = getCenter(dragged);
          states.forEach(function (other) {
            if (other === dragged) return;
            var oc = getCenter(other);
            var dx = oc.x - dc.x, dy = oc.y - dc.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var minDist = dc.r + oc.r;
            if (dist < minDist && dist > 0) {
              var push = minDist - dist;
              other.ox += (dx / dist) * push;
              other.oy += (dy / dist) * push;
              other.el.style.transition = "none";
              applyTransform(other);
            }
          });
        }
        for (var i = 0; i < states.length; i++) {
          if (states[i] === dragged) continue;
          for (var j = i + 1; j < states.length; j++) {
            if (states[j] === dragged) continue;
            var ac = getCenter(states[i]), bc = getCenter(states[j]);
            var dxAb = bc.x - ac.x, dyAb = bc.y - ac.y;
            var distAb = Math.sqrt(dxAb * dxAb + dyAb * dyAb);
            var minDistAb = ac.r + bc.r;
            if (distAb < minDistAb && distAb > 0) {
              var half = (minDistAb - distAb) / 2;
              var nx = dxAb / distAb, ny = dyAb / distAb;
              states[i].ox -= nx * half; states[i].oy -= ny * half;
              states[j].ox += nx * half; states[j].oy += ny * half;
              states[i].el.style.transition = "none";
              states[j].el.style.transition = "none";
              applyTransform(states[i]);
              applyTransform(states[j]);
            }
          }
        }
      }
    }

    states.forEach(function (s) {
      s.el.addEventListener("pointerenter", function () {
        if (s.mode === "dragging") return;
        s.mode = "hovering";
        s.scale = 1.07;
        s.el.style.transition = SPRING;
        applyTransform(s);
      });
      s.el.addEventListener("pointerleave", function () {
        if (s.mode === "dragging") return;
        s.scale = 1;
        s.el.style.transition = SPRING;
        applyTransform(s);
        setTimeout(function () {
          if (s.mode !== "dragging") {
            var t = (performance.now() - startTime) / 1000;
            s.floatPhaseX = Math.asin(Math.max(-1, Math.min(1, s.floatX / FLOAT_AMP))) - t * s.floatFreqX;
            s.floatPhaseY = Math.asin(Math.max(-1, Math.min(1, s.floatY / FLOAT_AMP))) - t * s.floatFreqY;
            s.mode = "idle"; s.el.style.transition = "none";
          }
        }, 430);
      });
    });

    var DRAG_THRESHOLD = 8;
    states.forEach(function (s) {
      s.el.addEventListener("dragstart", function (e) { e.preventDefault(); });
      s.el.addEventListener("click", function (e) {
        if (s.wasDragged) { e.preventDefault(); s.wasDragged = false; }
      });
      s.el.addEventListener("pointerdown", function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        s.el.setPointerCapture(e.pointerId);
        var startX = e.clientX, startY = e.clientY;
        var startOx = s.ox, startOy = s.oy;
        var moved = false;

        function onMove(ev) {
          var dx = ev.clientX - startX, dy = ev.clientY - startY;
          if (!moved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            moved = true; s.wasDragged = true; s.mode = "dragging";
            s.floatX = 0; s.floatY = 0; s.scale = 1.08;
            s.el.style.transition = "none";
            s.el.classList.add("fp-marble--dragging");
          }
          if (!moved) return;
          s.ox = startOx + dx; s.oy = startOy + dy;
          applyTransform(s); resolveCollisions(s);
        }

        function onUp() {
          s.el.removeEventListener("pointermove", onMove);
          s.el.removeEventListener("pointerup", onUp);
          s.el.removeEventListener("pointercancel", onUp);
          s.el.classList.remove("fp-marble--dragging");
          if (moved) {
            s.scale = 1; s.el.style.transition = SPRING; applyTransform(s);
            setTimeout(function () {
              var t = (performance.now() - startTime) / 1000;
              s.floatPhaseX = -t * s.floatFreqX; s.floatPhaseY = -t * s.floatFreqY;
              s.mode = "idle"; s.el.style.transition = "none";
            }, 450);
          } else {
            s.mode = "idle";
          }
        }

        s.el.addEventListener("pointermove", onMove);
        s.el.addEventListener("pointerup", onUp);
        s.el.addEventListener("pointercancel", onUp);
      });
    });

    var startTime = performance.now();

    function updateRotations() {
      var lightX = window.innerWidth, lightY = 0;
      states.forEach(function (s) {
        var rect = s.el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var angleDeg = Math.atan2(lightX - cx, -(lightY - cy)) * (180 / Math.PI);
        s.imgEl.style.transform = "rotate(" + (angleDeg - NATURAL_HIGHLIGHT_DEG) + "deg)";
      });
    }

    function animateFrame(now) {
      var t = (now - startTime) / 1000;
      states.forEach(function (s) {
        if (s.mode === "idle") {
          s.floatX = Math.sin(t * s.floatFreqX + s.floatPhaseX) * FLOAT_AMP;
          s.floatY = Math.sin(t * s.floatFreqY + s.floatPhaseY) * FLOAT_AMP;
          applyTransform(s);
        }
      });
      updateRotations();
      requestAnimationFrame(animateFrame);
    }

    requestAnimationFrame(function () {
      updateRotations();
      requestAnimationFrame(animateFrame);
    });

    window.addEventListener("scroll", updateRotations, { passive: true });
    window.addEventListener("resize", updateRotations);
  }
})();
