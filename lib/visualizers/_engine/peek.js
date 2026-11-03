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
    overlay.innerHTML = `<div class="bloob-peek__bar"><a class="bloob-peek__go" href="${path}">Go to its page</a><button type="button" class="bloob-peek__close" aria-label="Back">Back</button></div><div class="bloob-peek__stage">${object}</div>`;
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

  addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay) close(); });

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    let on = false;
    try { on = localStorage.getItem(PEEK_KEY) === "on"; } catch {}
    if (!on) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.target === "_blank" || a.closest(".bloob-peek__bar")) return;
    const path = peekTarget(a.getAttribute("href"), location.origin);
    if (!path || path === location.pathname) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    peek(path).then((shown) => { if (!shown) location.href = a.href; }, () => { location.href = a.href; });
  }, true);
}
