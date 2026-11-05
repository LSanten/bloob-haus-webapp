/**
 * Peek first: with the setting on (the visitor's tool belt), a click on a link to an object on
 * this site opens that object over the current page, whole and readable, playing its opening,
 * with a way to its own page and a way back. Leon, 2026-11-02: "before i go there to that link,
 * i just have the experience on the same link".
 *
 * peekTarget and extractObject are pure; startPeek is the browser part.
 */

const NOT_PAGES = /^\/(tags|assets|og|media|pagefind|search)\//;

/** The same-site page a link leads to, or null when it isn't a page worth peeking. */
export function peekTarget(href, siteOrigin) {
  if (!href || href.startsWith("#")) return null;
  let url;
  try {
    url = new URL(href, siteOrigin + "/");
  } catch {
    return null;
  }
  if (url.origin !== new URL(siteOrigin).origin) return null;
  const p = url.pathname;
  if (!p.endsWith("/") || NOT_PAGES.test(p)) return null;
  return p;
}

/** The outermost .bloob-object of a fetched page, as HTML, or null when the page has none. */
export function extractObject(html) {
  const start = html.search(/<div\b[^>]*\bclass="bloob-object\b/);
  if (start < 0) return null;
  const tag = /<\/?div\b[^>]*>/g;
  tag.lastIndex = start;
  let depth = 0;
  for (let m; (m = tag.exec(html)); ) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.lastIndex);
  }
  return null;
}

export const PEEK_KEY = "bh-peek";

/** Peek when the visitor turned it on, or always inside an area that asks for it. Pure. */
export function shouldPeek({ settingOn, inPeekArea }) {
  return Boolean(settingOn || inPeekArea);
}

/** Browser: catches clicks on links while the setting is on. */
export function startPeek({ open } = {}) {
  let overlay = null;

  const close = () => {
    overlay?.remove();
    overlay = null;
    document.documentElement.classList.remove("bh-peeking");
  };

  // Styles of the peeked page that this page lacks (an object's own CSS loads only where it appears).
  const borrowStyles = (doc) => {
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute("href");
      if (href && !document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(href)}"]`)) {
        document.head.appendChild(link.cloneNode());
      }
    });
  };

  async function peek(path) {
    const res = await fetch(path);
    if (!res.ok) return false;
    const html = await res.text();
    const object = extractObject(html);
    if (!object) return false;
    borrowStyles(new DOMParser().parseFromString(html, "text/html"));

    close();
    overlay = document.createElement("div");
    overlay.className = "bloob-peek";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "A peek at this page");
    overlay.innerHTML = `<div class="bloob-peek__card"><div class="bloob-peek__bar"><span class="bloob-peek__label">Peeking</span><a class="bloob-peek__go" href="${path}">Go to its page</a><button type="button" class="bloob-peek__close" aria-label="Close the peek">Close</button></div><div class="bloob-peek__stage">${object}</div></div>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("bh-peeking");
    overlay.querySelector(".bloob-peek__close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".bloob-peek__close").focus();

    const el = overlay.querySelector(".bloob-object");
    // Sharing belongs to the page itself ("Go to its page"); here it would share this page.
    el.querySelector(".bloob-share")?.remove();
    el.style.setProperty("--open", "0");
    el.dataset.state = "closed";
    if (el.dataset.opens) requestAnimationFrame(() => open?.(el));
    return true;
  }

  // Images in a peek get bigger in place (Leon, triage 05a060a8): the page's lightbox only bound the
  // galleries that existed when it started, so a peeked image fell through to its own file.
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.(".bloob-peek a.pswp-gallery__item");
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof window.bloobOpenLightbox !== "function") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const items = [...overlay.querySelectorAll("a.pswp-gallery__item")];
    window.bloobOpenLightbox(items, Math.max(0, items.indexOf(a)));
  }, true);

  // Escape closes the lightbox first; the peek stays until the next Escape.
  addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay && !document.querySelector(".pswp")) close(); });

  // Peek eyes: a small eye beside each link to another page of the site, in the page's own words.
  // Its click peeks; the link itself still goes there. The tool belt can hide them (bh-peek-eyes).
  document.querySelectorAll(".page-content a[href], .article-body a[href], .note-text a[href]").forEach((a) => {
    const path = peekTarget(a.getAttribute("href"), location.origin);
    if (!path || path === location.pathname || a.closest("[data-peek-always], .bloob-peek")) return;
    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "bloob-peek-eye";
    eye.setAttribute("aria-label", `Peek at ${a.textContent.trim() || "this page"}`);
    eye.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>';
    eye.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      peek(path).then((shown) => { if (!shown) location.href = a.href; }, () => { location.href = a.href; });
    });
    a.after(eye);
  });

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let on = false;
    try { on = localStorage.getItem(PEEK_KEY) === "on"; } catch {}
    const a = e.target.closest?.("a[href]");
    if (!shouldPeek({ settingOn: on, inPeekArea: Boolean(a?.closest("[data-peek-always]")) })) return;
    if (!a || a.target === "_blank" || a.closest(".bloob-peek__bar")) return;
    const path = peekTarget(a.getAttribute("href"), location.origin);
    if (!path || path === location.pathname) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    peek(path).then((shown) => { if (!shown) location.href = a.href; }, () => { location.href = a.href; });
  }, true);

  // Others may peek too (the search's eyes): a URL or path on this site; resolves to whether it showed.
  return (href) => {
    const path = peekTarget(href, location.origin);
    return path ? peek(path) : Promise.resolve(false);
  };
}
