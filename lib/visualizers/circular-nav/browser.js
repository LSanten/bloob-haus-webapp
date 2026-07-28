/**
 * ⚠️ TECH-DEBT #40 — this shape is NOT on the pure-renderer standard.
 *
 * It builds its markup here in browser.js, so a crawler sees an empty container,
 * and the future standalone playground cannot render it without a SECOND copy of
 * this logic — the exact drift that killed the scene-nav magic machine.
 *
 * WHEN YOU NEXT TOUCH THIS FILE, convert it: extract a pure `renderer.js` that
 * returns complete markup from data, leave browser.js behavior-only, and add a
 * test asserting the build-time output contains real `<a href>`s for every
 * display variant. Do NOT retrofit speculatively — convert on the next real change.
 *
 * Reference implementation: `lib/visualizers/collection/` (converted 2026-07-27).
 * Standard: `docs/architecture/visualizers.md` → "The pure-renderer standard".
 */

/**
 * Circular Nav Visualizer — Runtime (browser.js)
 *
 * Reads data-circular-nav JSON from .circular-nav-visualizer containers
 * and renders an animated flower: a center CTA bubble surrounded by
 * orbiting room bubbles.
 *
 * Settings (parsed from :::circular-nav block, available as data.settings):
 *   orbit_radius:       233   — distance from center to orbit bubble centers (px)
 *   center_size:        284   — diameter of center CTA bubble (px)
 *   orbit_size:         227   — diameter of orbit bubbles (px)
 *   center_hue:         268   — hue (0–360) of the CTA gradient
 *   orbit_hue:          265   — hue (0–360) of the orbit gradient
 *   center_text_size:   18    — font size of center label (px)
 *   orbit_text_size:    15    — font size of orbit labels (px)
 *   center_text_width:  180   — max-width of center label text (px, controls wrapping)
 *   orbit_text_width:   150   — max-width of orbit label text (px, controls wrapping)
 *   debug:              on    — show live sliders + copy-YAML button
 */

(function () {
  const containers = document.querySelectorAll(".circular-nav-visualizer");
  if (!containers.length) return;

  containers.forEach(function (container) {
    var data;
    try {
      data = JSON.parse(container.dataset.circularNav || "{}");
    } catch (e) {
      return;
    }

    var rooms = data.rooms || [];
    var center = data.center || null;
    var settings = data.settings || {};
    if (!rooms.length && !center) return;

    render(container, rooms, center, settings);
  });

  // --- HSL gradient generators — hue-parametrized so debug sliders work ---

  function ctaGradient(h) {
    return "radial-gradient(circle," +
      "hsla(" + h + ",90%,28%,1) 0%," +
      "hsla(" + h + ",88%,44%,1) 22%," +
      "hsla(" + (h + 12) + ",76%,52%,0.78) 42%," +
      "hsla(" + (h + 22) + ",65%,56%,0.3) 58%," +
      "hsla(" + (h + 22) + ",65%,56%,0) 70%)";
  }

  function ctaHoverGradient(h) {
    return "radial-gradient(circle," +
      "hsla(" + h + ",92%,36%,1) 0%," +
      "hsla(" + h + ",90%,50%,1) 22%," +
      "hsla(" + (h + 12) + ",78%,57%,0.82) 42%," +
      "hsla(" + (h + 22) + ",68%,61%,0.36) 58%," +
      "hsla(" + (h + 22) + ",68%,61%,0) 70%)";
  }

  function orbitGradient(h) {
    return "radial-gradient(circle," +
      "hsla(" + h + ",90%,42%,0.95) 0%," +
      "hsla(" + h + ",80%,34%,0.55) 35%," +
      "hsla(" + h + ",70%,26%,0.15) 55%," +
      "hsla(" + h + ",70%,26%,0) 65%)";
  }

  function orbitHoverGradient(h) {
    return "radial-gradient(circle," +
      "hsla(" + h + ",95%,52%,1) 0%," +
      "hsla(" + h + ",85%,44%,0.65) 35%," +
      "hsla(" + h + ",75%,34%,0.18) 55%," +
      "hsla(" + h + ",75%,34%,0) 65%)";
  }

  function render(container, rooms, center, settings) {
    var debug = settings.debug === "true" || settings.debug === "on";

    var BASE_SIZE = 720;
    var cx = BASE_SIZE / 2;
    var cy = BASE_SIZE / 2;
    var n = rooms.length;

    var p = {
      orbitRadius:      parseFloat(settings.orbit_radius)      || 233,
      centerSize:       parseFloat(settings.center_size)       || 284,
      orbitSize:        parseFloat(settings.orbit_size)        || 227,
      centerHue:        parseFloat(settings.center_hue)        || 268,
      orbitHue:         parseFloat(settings.orbit_hue)         || 265,
      centerTextSize:   parseFloat(settings.center_text_size)  || 18,
      orbitTextSize:    parseFloat(settings.orbit_text_size)   || 15,
      centerTextWidth:  parseFloat(settings.center_text_width) || 180,
      orbitTextWidth:   parseFloat(settings.orbit_text_width)  || 150,
    };

    var wrapper = document.createElement("div");
    wrapper.className = "cnav__wrapper";
    wrapper.style.width = BASE_SIZE + "px";
    wrapper.style.height = BASE_SIZE + "px";
    wrapper.style.position = "relative";
    container.appendChild(wrapper);

    // Create bubbles, store refs for live param updates
    // Each element also has ._labelEl pointing to its inner span
    var ctaEl = null;
    var orbitEls = [];

    if (center) {
      ctaEl = makeBubble(center.label, center.href, p.centerSize, "cnav__bubble--cta");
      ctaEl.style.animationDelay = "0s";
      wrapper.appendChild(ctaEl);
    }

    rooms.forEach(function (room, i) {
      var el = makeBubble(room.label, room.href, p.orbitSize, "cnav__bubble--orbit");
      el.style.animationDelay = (i * 0.4) + "s";
      wrapper.appendChild(el);
      orbitEls.push(el);
    });

    // Apply params: update sizes, positions, gradients, and text styles
    function applyParams(params) {
      // CSS vars on wrapper so :hover rules in CSS can read them
      wrapper.style.setProperty("--cnav-cta-bg",        ctaGradient(params.centerHue));
      wrapper.style.setProperty("--cnav-cta-hover-bg",  ctaHoverGradient(params.centerHue));
      wrapper.style.setProperty("--cnav-orbit-bg",       orbitGradient(params.orbitHue));
      wrapper.style.setProperty("--cnav-orbit-hover-bg", orbitHoverGradient(params.orbitHue));

      if (ctaEl) {
        ctaEl.style.width  = params.centerSize + "px";
        ctaEl.style.height = params.centerSize + "px";
        ctaEl.style.left   = (cx - params.centerSize / 2) + "px";
        ctaEl.style.top    = (cy - params.centerSize / 2) + "px";
        ctaEl._labelEl.style.fontSize = params.centerTextSize + "px";
        ctaEl._labelEl.style.maxWidth = params.centerTextWidth + "px";
      }

      orbitEls.forEach(function (el, i) {
        var angle = (2 * Math.PI / n) * i - Math.PI / 2;
        var bx = cx + params.orbitRadius * Math.cos(angle) - params.orbitSize / 2;
        var by = cy + params.orbitRadius * Math.sin(angle) - params.orbitSize / 2;
        el.style.width  = params.orbitSize + "px";
        el.style.height = params.orbitSize + "px";
        el.style.left   = bx + "px";
        el.style.top    = by + "px";
        el._labelEl.style.fontSize = params.orbitTextSize + "px";
        el._labelEl.style.maxWidth = params.orbitTextWidth + "px";
      });

      scaleToFit(wrapper, BASE_SIZE);
    }

    applyParams(p);
    window.addEventListener("resize", function () { scaleToFit(wrapper, BASE_SIZE); });

    if (debug) {
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      buildDebugPanel(container, p, applyParams);
    }
  }

  function buildDebugPanel(container, p, applyParams) {
    var panel = document.createElement("div");
    panel.className = "cnav-debug";

    var sliders = [
      { key: "orbitRadius",     label: "Orbit Radius",      min: 60,  max: 340, step: 1   },
      { key: "centerSize",      label: "Center Size",        min: 80,  max: 420, step: 1   },
      { key: "orbitSize",       label: "Orbit Size",         min: 60,  max: 320, step: 1   },
      { key: "centerHue",       label: "Center Hue",         min: 0,   max: 360, step: 1   },
      { key: "orbitHue",        label: "Orbit Hue",          min: 0,   max: 360, step: 1   },
      { key: "centerTextSize",  label: "Center Text Size",   min: 8,   max: 30,  step: 0.5, px: true },
      { key: "orbitTextSize",   label: "Orbit Text Size",    min: 8,   max: 30,  step: 0.5, px: true },
      { key: "centerTextWidth", label: "Center Text Width",  min: 40,  max: 300, step: 1   },
      { key: "orbitTextWidth",  label: "Orbit Text Width",   min: 40,  max: 260, step: 1   },
    ];

    sliders.forEach(function (s) {
      var row = document.createElement("div");
      row.className = "cnav-debug__row";

      var lbl = document.createElement("span");
      lbl.className = "cnav-debug__label";
      lbl.textContent = s.label;

      var input = document.createElement("input");
      input.type = "range";
      input.className = "cnav-debug__slider";
      input.min = s.min; input.max = s.max; input.step = s.step;
      input.value = p[s.key];

      var val = document.createElement("span");
      val.className = "cnav-debug__val";
      val.textContent = s.px ? p[s.key].toFixed(1) : Math.round(p[s.key]);

      input.addEventListener("input", function () {
        p[s.key] = parseFloat(input.value);
        val.textContent = s.px ? p[s.key].toFixed(1) : Math.round(p[s.key]);
        applyParams(p);
      });

      row.appendChild(lbl);
      row.appendChild(input);
      row.appendChild(val);
      panel.appendChild(row);
    });

    var copyBtn = document.createElement("button");
    copyBtn.className = "cnav-debug__copy";
    copyBtn.textContent = "Copy Settings YAML";
    copyBtn.addEventListener("click", function () {
      var yaml = [
        "debug: on",
        "orbit_radius: "      + Math.round(p.orbitRadius),
        "center_size: "       + Math.round(p.centerSize),
        "orbit_size: "        + Math.round(p.orbitSize),
        "center_hue: "        + Math.round(p.centerHue),
        "orbit_hue: "         + Math.round(p.orbitHue),
        "center_text_size: "  + p.centerTextSize.toFixed(1),
        "orbit_text_size: "   + p.orbitTextSize.toFixed(1),
        "center_text_width: " + Math.round(p.centerTextWidth),
        "orbit_text_width: "  + Math.round(p.orbitTextWidth),
      ].join("\n");
      navigator.clipboard.writeText(yaml).then(function () {
        copyBtn.textContent = "Copied!";
        setTimeout(function () { copyBtn.textContent = "Copy Settings YAML"; }, 1800);
      }).catch(function () {
        copyBtn.textContent = "Copy failed (needs HTTPS)";
        setTimeout(function () { copyBtn.textContent = "Copy Settings YAML"; }, 2500);
      });
    });

    panel.appendChild(copyBtn);
    container.appendChild(panel);
  }

  function makeBubble(label, href, size, extraClass) {
    var a = document.createElement("a");
    a.href = href;
    a.className = "cnav__bubble " + extraClass;
    a.style.width = size + "px";
    a.style.height = size + "px";
    a.style.position = "absolute";

    var span = document.createElement("span");
    span.className = "cnav__label";
    span.textContent = label;
    a.appendChild(span);
    a._labelEl = span; // store ref for applyParams

    return a;
  }

  function scaleToFit(wrapper, baseSize) {
    var parent = wrapper.parentElement;
    var available = parent.clientWidth || window.innerWidth;
    var maxSize = Math.min(available * 0.95, 760);
    var scale = Math.min(1, maxSize / baseSize);
    wrapper.style.transform = "scale(" + scale + ")";
    wrapper.style.transformOrigin = "top center";
    wrapper.style.marginBottom = ((baseSize * scale) - baseSize) + "px";
  }
})();
