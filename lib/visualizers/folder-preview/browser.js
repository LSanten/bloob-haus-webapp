/**
 * Folder Preview Visualizer — Runtime (browser.js)
 *
 * For seo: true containers (cards pre-rendered at build time):
 *   - Wires the fp-search-input to show/hide fp-card elements; skips graph.json fetch.
 *
 * For runtime containers (seo: false, default):
 *   - Fetches /graph.json and renders pages belonging to the specified folder.
 *
 * Settings (via code fence YAML, passed as data-fp-settings JSON):
 *   folder: explicit folder name (required when on root/homepage)
 *   seo:    true | false — when true, cards are pre-rendered; browser.js only attaches search
 *   sort:   alpha (default) | reverse-alpha | recent
 *   limit:  max number of pages to show
 *   style:  (default list) | slider-cards
 *   title:  section label shown above slider-cards (default "ARTICLES")
 *   id:     section id (for slider-cards, set by build-time transform)
 */

(function () {
  const containers = document.querySelectorAll(".folder-preview-visualizer");
  if (!containers.length) return;

  // Attach text search to SEO-rendered containers (cards already in DOM).
  // For non-SEO containers, collect them for the runtime graph.json fetch below.
  function attachSearch(container) {
    var input = container.querySelector(".fp-search-input");
    var cards = container.querySelectorAll(".fp-card");
    if (!input || !cards.length) return;
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().trim();
      cards.forEach(function (card) {
        card.hidden = q ? !card.textContent.toLowerCase().includes(q) : false;
      });
    });
  }

  var runtimeContainers = [];
  containers.forEach(function (container) {
    var settings = {};
    try { settings = JSON.parse(container.dataset.fpSettings || "{}"); } catch (e) {}

    if (settings.seo) {
      // Cards pre-rendered at build time — just wire up search, skip graph.json fetch
      attachSearch(container);
    } else {
      runtimeContainers.push({ container: container, settings: settings });
    }
  });

  if (!runtimeContainers.length) return;

  // Fallback folder detection from URL path (for folder index pages)
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const currentFolder = pathParts.length >= 1 ? pathParts[0] : null;

  fetch("/graph.json")
    .then(function (res) { return res.json(); })
    .then(function (graph) {
      const allNodes = graph.nodes || [];

      runtimeContainers.forEach(function (item) {
        var container = item.container;
        var settings = item.settings;

        const folder = settings.folder || currentFolder;
        if (!folder) return;
        const folderLower = folder.toLowerCase();

        const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
        const sort = settings.sort || "alpha";

        // Filter to pages in this folder (exclude current page, folder root, index pages,
        // and non-public statuses — unlisted pages are absent from graph.json entirely;
        // archived pages are present but excluded from listings)
        const folderIndexId = "/" + folder + "/";
        let pages = allNodes.filter(function (node) {
          return (
            (node.section || "").toLowerCase() === folderLower &&
            node.type === "page" &&
            node.id !== window.location.pathname &&
            node.id !== folderIndexId &&
            !node.id.endsWith("/index/") &&
            node.website_status !== "archived"
          );
        });

        // Sort
        if (sort === "reverse-alpha" || sort === "recent") {
          pages.sort(function (a, b) {
            const ta = (a.title || "").toLowerCase();
            const tb = (b.title || "").toLowerCase();
            return tb.localeCompare(ta);
          });
        } else {
          pages.sort(function (a, b) {
            const ta = (a.title || "").toLowerCase();
            const tb = (b.title || "").toLowerCase();
            return ta.localeCompare(tb);
          });
        }

        if (isFinite(limit)) pages = pages.slice(0, limit);

        if (settings.style === "slider-cards") {
          renderSliderCards(container, pages, settings);
        } else if (settings.layout === "bubbles") {
          renderBubbles(container, pages);
        } else if (settings.layout === "marbles") {
          renderMarbles(container, pages);
        } else if (settings.style === "list") {
          renderList(container, pages);
        } else {
          renderCards(container, pages);
        }
      });
    })
    .catch(function (err) {
      console.warn("[folder-preview] Failed to load graph.json:", err);
    });

  function renderSliderCards(container, pages, settings) {
    const title = settings.title || "ARTICLES";

    if (!pages.length) {
      const empty = document.createElement("p");
      empty.className = "folder-preview__empty";
      empty.textContent = "No articles yet.";
      container.appendChild(empty);
      return;
    }

    const slides = pages
      .map(function (node) {
        const href = node.redirect || node.id;
        const externalAttr = node.redirect ? ' target="_blank" rel="noopener"' : '';

        const imgHtml = node.image
          ? `<a href="${href}"${externalAttr}><img class="articles__image" src="${node.image}" alt="${node.title || ""}" loading="lazy"></a>`
          : `<div class="articles__image articles__image--placeholder"></div>`;
        return `<div class="swiper-slide articles__content">
          ${imgHtml}
          <div class="articles__inner-content">
            <h3 class="articles__title">${node.title || ""}</h3>
          </div>
          <a href="${href}" class="articles__read-more button-1"${externalAttr}>READ MORE</a>
        </div>`;
      })
      .join("");

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

    // Initialize Swiper — may already be available or need to wait for load
    function initSwiper() {
      if (typeof Swiper === "undefined") return;
      new Swiper("#articles-swiper", {
        grabCursor: true,
        speed: 500,
        spaceBetween: 10,
        loop: pages.length > 1,
        slidesPerView: 1.6,
        navigation: {
          nextEl: ".articles__next-button",
          prevEl: ".articles__prev-button",
        },
        breakpoints: {
          768: { slidesPerView: 1.63, spaceBetween: 20 },
          1366: { slidesPerView: 2.46, spaceBetween: 130 },
          2560: { slidesPerView: 2.45, spaceBetween: 248 },
        },
      });
    }

    if (document.readyState === "complete") {
      initSwiper();
    } else {
      window.addEventListener("load", initSwiper);
    }
  }

  function renderBubbles(container, pages) {
    if (!pages.length) {
      const empty = document.createElement("p");
      empty.className = "folder-preview__empty";
      empty.textContent = "Nothing here yet.";
      container.appendChild(empty);
      return;
    }

    // Scatter layout: two loose columns with staggered vertical offset
    // Bubble size varies slightly by index for organic feel
    const wrapper = document.createElement("div");
    wrapper.className = "fp-bubbles";

    // Base sizes cycle through a few sizes for organic variety
    const sizes = [140, 120, 155, 125, 140, 115, 150, 130];

    pages.forEach(function (node, i) {
      const size = sizes[i % sizes.length];
      const a = document.createElement("a");
      a.href = node.id;
      a.className = "fp-bubble";
      a.style.width = size + "px";
      a.style.height = size + "px";

      // Stagger: odd-indexed bubbles shift down
      if (i % 2 === 1) {
        a.style.marginTop = "40px";
      }

      if (node.content_type) {
        const type = document.createElement("span");
        type.className = "fp-bubble__type";
        type.textContent = node.content_type;
        a.appendChild(type);
      }

      const title = document.createElement("span");
      title.className = "fp-bubble__title";
      title.textContent = node.title || node.id;
      a.appendChild(title);

      wrapper.appendChild(a);
    });

    container.appendChild(wrapper);
  }

  function renderMarbles(container, pages) {
    if (!pages.length) {
      var empty = document.createElement("p");
      empty.className = "folder-preview__empty";
      empty.textContent = "Nothing here yet.";
      container.appendChild(empty);
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

      var title = document.createElement("span");
      title.className = "fp-marble__title";
      title.textContent = node.title || node.id;
      a.appendChild(title);

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
        mode: "idle",    // "idle" | "hovering" | "dragging"
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

    // Returns visual center + actual rendered radius (accounts for scale transforms)
    function getCenter(s) {
      var r = s.el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
    }

    // Resolve collisions: dragged marble is immovable; all other pairs share the push.
    // Run N passes so cascading contacts propagate (marble A pushes B which pushes C).
    function resolveCollisions(dragged) {
      for (var pass = 0; pass < 5; pass++) {
        // Dragged vs all others
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
        // All non-dragged pairs — both move equally (equal mass)
        for (var i = 0; i < states.length; i++) {
          if (states[i] === dragged) continue;
          for (var j = i + 1; j < states.length; j++) {
            if (states[j] === dragged) continue;
            var ac = getCenter(states[i]), bc = getCenter(states[j]);
            var dx = bc.x - ac.x, dy = bc.y - ac.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var minDist = ac.r + bc.r;
            if (dist < minDist && dist > 0) {
              var half = (minDist - dist) / 2;
              var nx = dx / dist, ny = dy / dist;
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

    // --- Hover (handled in JS so it doesn't fight float animation transforms) ---
    states.forEach(function (s) {
      s.el.addEventListener("pointerenter", function () {
        if (s.mode === "dragging") return;
        s.mode = "hovering";
        // Don't zero floatX/Y — freeze in place so marble doesn't jump
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
            // Re-phase sine so float resumes from the frozen position without a jump
            var t = (performance.now() - startTime) / 1000;
            s.floatPhaseX = Math.asin(Math.max(-1, Math.min(1, s.floatX / FLOAT_AMP))) - t * s.floatFreqX;
            s.floatPhaseY = Math.asin(Math.max(-1, Math.min(1, s.floatY / FLOAT_AMP))) - t * s.floatFreqY;
            s.mode = "idle"; s.el.style.transition = "none";
          }
        }, 430);
      });
    });

    // --- Drag (Pointer Events API — unified mouse + touch) ---
    var DRAG_THRESHOLD = 8;

    states.forEach(function (s) {
      s.el.addEventListener("dragstart", function (e) { e.preventDefault(); });

      // Block the native click that fires after pointerup when we dragged
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
            moved = true;
            s.wasDragged = true;
            s.mode = "dragging";
            s.floatX = 0; s.floatY = 0;
            s.scale = 1.08;
            s.el.style.transition = "none";
            s.el.classList.add("fp-marble--dragging");
          }
          if (!moved) return;
          s.ox = startOx + dx;
          s.oy = startOy + dy;
          applyTransform(s);
          resolveCollisions(s);
        }

        function onUp() {
          s.el.removeEventListener("pointermove", onMove);
          s.el.removeEventListener("pointerup", onUp);
          s.el.removeEventListener("pointercancel", onUp);
          s.el.classList.remove("fp-marble--dragging");
          if (moved) {
            s.scale = 1;
            s.el.style.transition = SPRING;
            applyTransform(s);
            setTimeout(function () {
              // Re-phase sine so float resumes from 0 (where it was frozen during drag)
              var t = (performance.now() - startTime) / 1000;
              s.floatPhaseX = -t * s.floatFreqX;
              s.floatPhaseY = -t * s.floatFreqY;
              s.mode = "idle";
              s.el.style.transition = "none";
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

    // --- Float animation + light-source rotation (combined rAF loop) ---
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

  function renderCards(container, pages) {
    if (!pages.length) {
      var empty = document.createElement("p");
      empty.className = "folder-preview__empty";
      empty.textContent = "Nothing here yet.";
      container.appendChild(empty);
      return;
    }

    var grid = document.createElement("div");
    grid.className = "fp-cards";

    pages.forEach(function (node) {
      var a = document.createElement("a");
      a.href = node.redirect || node.id;
      a.className = "fp-card";
      if (node.redirect) {
        a.target = "_blank";
        a.rel = "noopener";
      }

      var imgWrap = document.createElement("div");
      imgWrap.className = "fp-card__img-wrap";
      if (node.image) {
        var img = document.createElement("img");
        img.src = node.image;
        img.alt = node.title || "";
        img.className = "fp-card__img";
        img.loading = "lazy";
        imgWrap.appendChild(img);
      } else {
        imgWrap.className += " fp-card__img-wrap--placeholder";
      }
      a.appendChild(imgWrap);

      var body = document.createElement("div");
      body.className = "fp-card__body";
      var title = document.createElement("span");
      title.className = "fp-card__title";
      title.textContent = node.title || node.id;
      body.appendChild(title);
      if (node.subtitle) {
        var subtitle = document.createElement("p");
        subtitle.className = "fp-card__subtitle";
        subtitle.textContent = node.subtitle;
        body.appendChild(subtitle);
      }
      a.appendChild(body);

      grid.appendChild(a);
    });

    container.appendChild(grid);
  }

  function renderList(container, pages) {
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
  }
})();
