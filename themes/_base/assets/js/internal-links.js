/**
 * Internal Link Pills
 *
 * Detects same-origin links (and known cross-site bloob.haus links) in the
 * content area and styles them as pills. Fetches graph.json once on page load
 * to look up each page's bloob-object icon.
 *
 * Cross-site links (e.g. buffbaby.bloob.haus → leons.bloob.haus) are also
 * supported: the remote graph.json is fetched eagerly on page load if any
 * cross-site links are detected. Requires the remote site to serve graph.json
 * with Access-Control-Allow-Origin: * (set via Cloudflare _headers).
 *
 * Opt-out: add data-no-pills to any container to exclude its links.
 */
(function () {
  "use strict";

  // Cache: origin → Promise<Map<pathname, { title, bloobIcon }>>
  var graphCache = {};

  function fetchGraph(origin) {
    if (!graphCache[origin]) {
      graphCache[origin] = fetch(origin + "/graph.json")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          var map = {};
          if (!data) return map;
          for (var i = 0; i < data.nodes.length; i++) {
            var node = data.nodes[i];
            map[node.id] = { title: node.title, bloobIcon: node.bloobIcon || null };
          }
          return map;
        })
        .catch(function () { return {}; });
    }
    return graphCache[origin];
  }

  // Only *.bloob.haus cross-site links get pills (avoids pilling arbitrary external links)
  function isBloobHaus(hostname) {
    return hostname.endsWith(".bloob.haus");
  }

  // Content pages always end with / in Eleventy. Skip asset/file links.
  function isContentPath(pathname) {
    var last = pathname.split("/").pop();
    return !last || last.indexOf(".") === -1;
  }

  function applyPill(link, bloobIconUrl) {
    var inHeading = !!link.closest("h1, h2, h3, h4, h5, h6");
    if (!inHeading) link.classList.add("internal-link");
    if (bloobIconUrl && !link.querySelector(".internal-link__icon")) {
      var img = document.createElement("img");
      img.src = bloobIconUrl;
      img.className = "internal-link__icon";
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      link.insertBefore(img, link.firstChild);
    }
  }

  function init() {
    // Collect all <a> elements in the content area (skip nav, footer, data-no-pills)
    var container = document.querySelector("article, main, .content") || document.body;
    var allLinks = container.querySelectorAll("a[href]");

    var sameOriginLinks = [];
    var crossOriginByDomain = {}; // origin → [link, ...]

    for (var i = 0; i < allLinks.length; i++) {
      var link = allLinks[i];

      // Respect opt-out containers
      if (link.closest("[data-no-pills]")) continue;

      // Only pill inline links — skip card/nav/structural links.
      // p: prose wiki-links. li: list items (tight lists have no <p> wrapper). td: table cells.
      // h1-h6: headings get icon only (no pill style).
      if (!link.closest("p, li, td, h1, h2, h3, h4, h5, h6")) continue;

      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") continue;

      try {
        var url = new URL(href, location.href);

        if (!isContentPath(url.pathname)) continue;

        if (url.origin === location.origin) {
          sameOriginLinks.push({ link: link, pathname: url.pathname });
        } else if (isBloobHaus(url.hostname)) {
          if (!crossOriginByDomain[url.origin]) crossOriginByDomain[url.origin] = [];
          crossOriginByDomain[url.origin].push({ link: link, pathname: url.pathname });
        }
      } catch (_) {}
    }

    // Fetch same-origin graph.json and apply pills
    if (sameOriginLinks.length > 0) {
      fetchGraph(location.origin).then(function (graphMap) {
        for (var i = 0; i < sameOriginLinks.length; i++) {
          var item = sameOriginLinks[i];
          var pageData = graphMap[item.pathname] || graphMap[item.pathname.replace(/\/$/, "") + "/"];
          // Only pill links that are known content pages (exist in graph)
          if (pageData !== undefined) {
            applyPill(item.link, pageData.bloobIcon);
          }
        }
      });
    }

    // Fetch cross-site graph.json eagerly for each detected bloob.haus domain
    var crossOrigins = Object.keys(crossOriginByDomain);
    for (var j = 0; j < crossOrigins.length; j++) {
      (function (origin, links) {
        fetchGraph(origin).then(function (graphMap) {
          for (var k = 0; k < links.length; k++) {
            var item = links[k];
            var pageData = graphMap[item.pathname] || graphMap[item.pathname.replace(/\/$/, "") + "/"];
            // Cross-site: pill all detected bloob.haus links, icon only if in graph
            applyPill(item.link, pageData ? pageData.bloobIcon : null);
          }
        });
      })(crossOrigins[j], crossOriginByDomain[crossOrigins[j]]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
