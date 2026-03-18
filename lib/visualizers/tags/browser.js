/**
 * Tags Visualizer — Runtime (browser.js)
 *
 * Fetches /tagIndex.json and renders a tag cloud or list into
 * .tags-visualizer containers placed by the build-time transform (index.js).
 *
 * Settings (via code fence YAML):
 *   style:      cloud (default) | list
 *   sort:       count (default, biggest first) | alpha
 *   limit:      max tags to show (default: all)
 *   show_count: true (default) | false
 */

(function () {
  const containers = document.querySelectorAll(".tags-visualizer");
  if (!containers.length) return;

  fetch("/tagIndex.json")
    .then(function (res) { return res.json(); })
    .then(function (tagIndex) {
      containers.forEach(function (container) {
        let settings = {};
        try {
          settings = JSON.parse(container.dataset.tagsSettings || "{}");
        } catch (e) {}

        const style = settings.style || "cloud";
        const sort = settings.sort || "count";
        const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
        const showCount = settings.show_count !== false;

        // Build array of [tag, count] pairs
        let tags = Object.entries(tagIndex).map(function ([tag, data]) {
          return { tag: tag, count: data.count || 0 };
        });

        // Sort
        if (sort === "alpha") {
          tags.sort(function (a, b) { return a.tag.localeCompare(b.tag); });
        } else {
          tags.sort(function (a, b) { return b.count - a.count; });
        }

        // Limit
        if (isFinite(limit)) {
          tags = tags.slice(0, limit);
        }

        // Max count for weight scaling — computed before shuffle so tags[0] is still the max
        const maxCount = tags.length ? tags[0].count : 1;

        // Shuffle for cloud style so large tags are scattered, not front-loaded
        if (style === "cloud") {
          for (let i = tags.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = tags[i]; tags[i] = tags[j]; tags[j] = tmp;
          }
        }

        const wrapper = document.createElement("div");
        wrapper.className = "tags-visualizer__inner tags-visualizer--" + style;

        tags.forEach(function (item) {
          const a = document.createElement("a");
          a.href = "/tags/" + encodeURIComponent(item.tag.toLowerCase().replace(/\s+/g, "-")) + "/";
          a.className = "tags-visualizer__tag";

          if (style === "cloud") {
            // Normalize weight 1–5 for font sizing
            const weight = Math.ceil((item.count / maxCount) * 5);
            a.setAttribute("data-weight", weight);
            // Random vertical drift so tags float at different heights
            const drift = (Math.random() * 12 - 6).toFixed(1);
            a.style.transform = "translateY(" + drift + "px)";
          }

          a.textContent = item.tag;

          if (showCount) {
            const badge = document.createElement("span");
            badge.className = "tags-visualizer__count";
            badge.textContent = item.count;
            a.appendChild(badge);
          }

          wrapper.appendChild(a);
        });

        container.appendChild(wrapper);
      });
    })
    .catch(function (err) {
      console.warn("[tags] Failed to load tagIndex.json:", err);
    });
})();
