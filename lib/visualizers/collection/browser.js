/**
 * Collection Visualizer — Runtime (browser.js)
 *
 * BEHAVIOR ONLY. This file must never build markup.
 *
 * Every display mode is rendered at build time by index.js via the pure
 * renderer.js, so by the time this runs the elements already exist. This file
 * attaches what genuinely needs a browser: search filtering, marble drag
 * physics, and Swiper initialisation.
 *
 * The one exception is the FALLBACK path: if a container arrives empty
 * (graph.json was unavailable at build time), it calls the *same* renderer.js
 * to fill it, then attaches the same behaviors. That is the second host of the
 * three-host model — not a second implementation.
 *
 * See docs/architecture/visualizers.md → "The pure-renderer standard".
 *
 * Imports renderer.js and resolve.js — esbuild bundles them into this IIFE.
 */

import { resolvePages, parseSource } from "./resolve.js";
import { renderCollectionInner, isSearchDisabled } from "./renderer.js";

(function () {
  var containers = document.querySelectorAll(".collection-visualizer");
  if (!containers.length) return;

  // Every display mode's filterable unit. Search works across all of them.
  var ITEM_SELECTOR = ".fp-card, .fp-marble, .fp-bubble, .folder-preview__item";

  // ── Search ────────────────────────────────────────────────────────────────

  function itemHaystack(el) {
    return (el.textContent + " " + (el.dataset.fpTags || "")).toLowerCase().replace(/-/g, " ");
  }

  function itemHref(el) {
    return el.getAttribute("href") || (el.querySelector("a") || {}).getAttribute?.("href") || "";
  }

  // Metadata-only text filter (search: basics)
  function attachSearch(container) {
    var input = container.querySelector(".fp-search-input");
    var items = container.querySelectorAll(ITEM_SELECTOR);
    if (!input || !items.length) return;
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().replace(/-/g, " ").trim();
      items.forEach(function (el) {
        el.hidden = q ? !itemHaystack(el).includes(q) : false;
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

  function attachCombinedSearch(container, settings) {
    var input = container.querySelector(".fp-search-input");
    var items = Array.from(container.querySelectorAll(ITEM_SELECTOR));
    if (!input || !items.length) return;

    var pending = "";

    input.addEventListener("input", function () {
      var q = input.value.trim();
      pending = q;

      if (!q) {
        items.forEach(function (el) { el.hidden = false; });
        return;
      }

      // Step 1 — instant metadata filter (synchronous, no flash)
      var norm = q.toLowerCase().replace(/-/g, " ");
      var metaMatches = new Set();
      items.forEach(function (el) {
        if (itemHaystack(el).includes(norm)) metaMatches.add(el);
      });
      items.forEach(function (el) { el.hidden = !metaMatches.has(el); });

      // Step 2 — Pagefind expands the result set when it resolves
      initPagefind().then(function (pf) {
        if (pending !== q || !pf) return;
        var filters = buildPagefindFilters(settings.source);
        return pf.search(q, filters ? { filters: filters } : {}).then(function (results) {
          if (pending !== q) return;
          return Promise.all(results.results.map(function (r) { return r.data(); }))
            .then(function (data) {
              if (pending !== q) return;
              var pfUrls = new Set(data.map(function (d) { return d.url; }));
              // Union: show if metadata OR Pagefind matched — never hide more than step 1 did
              items.forEach(function (el) {
                el.hidden = !metaMatches.has(el) && !pfUrls.has(itemHref(el));
              });
            });
        });
      });
    });
  }

  // ── Slider behavior ────────────────────────────────────────────────────────

  function initSlider(container, pageCount) {
    function start() {
      if (typeof Swiper === "undefined") return;
      new Swiper(container.querySelector(".articles__repeater"), {
        grabCursor: true,
        speed: 500,
        spaceBetween: 10,
        loop: pageCount > 1,
        slidesPerView: 1.6,
        navigation: {
          nextEl: container.querySelector(".articles__next-button"),
          prevEl: container.querySelector(".articles__prev-button"),
        },
        breakpoints: {
          768:  { slidesPerView: 1.63, spaceBetween: 20 },
          1366: { slidesPerView: 2.46, spaceBetween: 130 },
          2560: { slidesPerView: 2.45, spaceBetween: 248 },
        },
      });
    }
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start);
  }

  // ── Marble behavior (drag, collision, float, specular highlight) ───────────

  function initMarbles(container) {
    var els = Array.from(container.querySelectorAll(".fp-marble"));
    if (!els.length) return;

    var states = els.map(function (el) {
      return {
        el: el,
        imgEl: el.querySelector(".fp-marble__img"),
        ox: 0, oy: 0,
        floatX: 0, floatY: 0,
        floatPhaseX: Math.random() * Math.PI * 2,
        floatPhaseY: Math.random() * Math.PI * 2,
        floatFreqX: 0.28 + Math.random() * 0.22,
        floatFreqY: 0.22 + Math.random() * 0.20,
        scale: 1,
        mode: "idle",
        wasDragged: false,
      };
    });

    var SPRING = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
    var FLOAT_AMP = 4;
    var NATURAL_HIGHLIGHT_DEG = -30;

    // Search can hide marbles; a hidden element has a zero-size rect, which
    // would corrupt collision resolution and the highlight angle.
    function isActive(s) { return !s.el.hidden; }

    function applyTransform(s) {
      s.el.style.transform =
        "translate(" + (s.ox + s.floatX) + "px," + (s.oy + s.floatY) + "px) scale(" + s.scale + ")";
    }

    function getCenter(s) {
      var r = s.el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
    }

    // Resolve collisions: dragged marble is immovable; all other pairs share the push.
    // Run N passes so cascading contacts propagate (marble A pushes B which pushes C).
    function resolveCollisions(dragged) {
      var live = states.filter(isActive);
      for (var pass = 0; pass < 5; pass++) {
        if (dragged) {
          // Dragged vs all others
          var dc = getCenter(dragged);
          live.forEach(function (other) {
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
        for (var i = 0; i < live.length; i++) {
          if (live[i] === dragged) continue;
          for (var j = i + 1; j < live.length; j++) {
            if (live[j] === dragged) continue;
            var ac = getCenter(live[i]), bc = getCenter(live[j]);
            var dxAb = bc.x - ac.x, dyAb = bc.y - ac.y;
            var distAb = Math.sqrt(dxAb * dxAb + dyAb * dyAb);
            var minDistAb = ac.r + bc.r;
            if (distAb < minDistAb && distAb > 0) {
              var half = (minDistAb - distAb) / 2;
              var nx = dxAb / distAb, ny = dyAb / distAb;
              live[i].ox -= nx * half; live[i].oy -= ny * half;
              live[j].ox += nx * half; live[j].oy += ny * half;
              live[i].el.style.transition = "none";
              live[j].el.style.transition = "none";
              applyTransform(live[i]);
              applyTransform(live[j]);
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
        if (!isActive(s) || !s.imgEl) return;
        var rect = s.el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var angleDeg = Math.atan2(lightX - cx, -(lightY - cy)) * (180 / Math.PI);
        s.imgEl.style.transform = "rotate(" + (angleDeg - NATURAL_HIGHLIGHT_DEG) + "deg)";
      });
    }

    function animateFrame(now) {
      var t = (now - startTime) / 1000;
      states.forEach(function (s) {
        if (s.mode === "idle" && isActive(s)) {
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

  // ── Activation ─────────────────────────────────────────────────────────────

  /** Attach behaviors to markup that already exists in the container. */
  function activate(container, settings) {
    var display = settings.display || "cards";

    if (display === "marbles") {
      initMarbles(container);
    } else if (display === "slider") {
      initSlider(container, container.querySelectorAll(".swiper-slide").length);
    }

    if (display !== "slider" && !isSearchDisabled(settings)) {
      if (settings.search === "basics") attachSearch(container);
      else attachCombinedSearch(container, settings);
    }
  }

  var needsFallback = [];

  containers.forEach(function (container) {
    var settings = {};
    try { settings = JSON.parse(container.dataset.collectionSettings || "{}"); } catch (e) {}

    if (container.children.length > 0) {
      // Server-rendered (the normal path) — behavior only.
      activate(container, settings);
    } else {
      // graph.json was unavailable at build time.
      needsFallback.push({ container: container, settings: settings });
    }
  });

  if (!needsFallback.length) return;

  // ── Fallback host: same renderer, data from fetch ──────────────────────────

  // Fallback folder from URL path (for folder index pages)
  var pathParts = window.location.pathname.split("/").filter(Boolean);
  var currentFolder = pathParts.length >= 1 ? pathParts[0] : null;

  fetch("/graph.json")
    .then(function (res) { return res.json(); })
    .then(function (graph) {
      var allNodes = graph.nodes || [];

      needsFallback.forEach(function (item) {
        var container = item.container;
        var settings = item.settings;

        // For folder source without explicit folder=, fall back to current URL folder
        if (!settings.source && currentFolder) {
          settings = Object.assign({}, settings, { source: "folder=" + currentFolder });
        }

        var pages = resolvePages(allNodes, settings).filter(function (n) {
          return n.id !== window.location.pathname;
        });

        container.innerHTML = renderCollectionInner(pages, settings);
        activate(container, settings);
      });
    })
    .catch(function (err) {
      console.warn("[collection] Failed to load graph.json:", err);
    });
})();
