/**
 * Circular Nav Visualizer — Runtime (browser.js)
 *
 * Reads data-circular-nav JSON from .circular-nav-visualizer containers
 * and renders an animated flower: a center CTA bubble surrounded by
 * orbiting room bubbles.
 *
 * Layout:
 *   - All bubbles positioned absolutely within a square container
 *   - Orbit radius = 38% of container size, starting from top (−π/2)
 *   - Each bubble floats with a staggered vertical sine animation
 *   - Container scales to fit viewport on mobile
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
    if (!rooms.length && !center) return;

    render(container, rooms, center);
  });

  function render(container, rooms, center) {
    var wrapper = document.createElement("div");
    wrapper.className = "cnav__wrapper";

    container.appendChild(wrapper);

    var BASE_SIZE = 648;
    var ORBIT_BUBBLE = 162;
    var CENTER_BUBBLE = 203;
    var ORBIT_RADIUS = BASE_SIZE * 0.36;

    wrapper.style.width = BASE_SIZE + "px";
    wrapper.style.height = BASE_SIZE + "px";
    wrapper.style.position = "relative";

    var cx = BASE_SIZE / 2;
    var cy = BASE_SIZE / 2;

    // --- Center CTA bubble ---
    if (center) {
      var cta = makeBubble(center.label, center.href, CENTER_BUBBLE, "cnav__bubble--cta");
      cta.style.left = (cx - CENTER_BUBBLE / 2) + "px";
      cta.style.top = (cy - CENTER_BUBBLE / 2) + "px";
      cta.style.animationDelay = "0s";
      wrapper.appendChild(cta);
    }

    // --- Orbit bubbles ---
    var n = rooms.length;
    rooms.forEach(function (room, i) {
      var angle = (2 * Math.PI / n) * i - Math.PI / 2; // start at top
      var bx = cx + ORBIT_RADIUS * Math.cos(angle) - ORBIT_BUBBLE / 2;
      var by = cy + ORBIT_RADIUS * Math.sin(angle) - ORBIT_BUBBLE / 2;

      var bubble = makeBubble(room.label, room.href, ORBIT_BUBBLE, "cnav__bubble--orbit");
      bubble.style.left = bx + "px";
      bubble.style.top = by + "px";
      bubble.style.animationDelay = (i * 0.4) + "s";
      wrapper.appendChild(bubble);
    });

    scaleToFit(wrapper, BASE_SIZE);
    window.addEventListener("resize", function () {
      scaleToFit(wrapper, BASE_SIZE);
    });
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

    return a;
  }

  function scaleToFit(wrapper, baseSize) {
    var parent = wrapper.parentElement;
    var available = parent.clientWidth || window.innerWidth;
    var maxSize = Math.min(available * 0.95, 680);
    var scale = Math.min(1, maxSize / baseSize);
    wrapper.style.transform = "scale(" + scale + ")";
    wrapper.style.transformOrigin = "top center";
    wrapper.style.marginBottom = ((baseSize * scale) - baseSize) + "px";
  }
})();
