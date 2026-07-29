/**
 * Scene Nav — link target policy.
 *
 * Pure functions. No `location`, no DOM — the current origin is always injected, so the
 * same code decides link behavior at runtime (browser.js), in the builder GUI, and in tests.
 *
 * The rule a visitor experiences:
 *
 *   a goto that points at THIS site   → opens in the same tab (you stay in the site)
 *   a goto that points somewhere else → opens in a new tab (the site stays open behind it)
 *
 * An explicit `newTab: on` / `newTab: off` in the grammar always wins over that default.
 * Absent (the common case) means "auto" — nothing is written to the markdown and the
 * origin comparison decides.
 */

// Extensions that make a dotted token content rather than a hostname. Used only by the
// builder's authoring hint — never by the routing decision itself.
const CONTENT_EXTENSIONS = /\.(md|markdown|png|jpe?g|gif|webp|avif|svg|pdf|html?|txt|json)$/i;

/**
 * Is this goto target off-site?
 *
 * Only two forms can point off-site: an absolute URL with a scheme (`https://host/…`)
 * and a scheme-relative one (`//host/…`). Everything else — `note.md`, `/about/`,
 * `../x`, `#anchor`, `?q=1` — is a path inside this site by definition.
 *
 * Non-http(s) schemes (`mailto:`, `tel:`) count as internal: the OS handler takes over
 * and the page stays put, so opening a blank tab for them is exactly wrong.
 *
 * @param {string} value  the goto target, as authored
 * @param {string} origin the current page origin, e.g. "https://melt.bloob.haus"
 * @returns {boolean}
 */
export function isExternalTarget(value, origin) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (v.startsWith("#") || v.startsWith("?")) return false;

  const scheme = v.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!scheme && !v.startsWith("//")) return false;
  if (scheme && !/^https?$/i.test(scheme[1])) return false;

  try {
    return new URL(v, origin).host !== new URL(origin).host;
  } catch {
    return false;
  }
}

/**
 * The final answer for a click: new tab, or this tab?
 *
 * @param {string} value             the goto target
 * @param {string} origin            the current page origin
 * @param {boolean|null} [explicit]  the element's `newTab` setting; null/undefined = auto
 * @returns {boolean}
 */
export function shouldOpenInNewTab(value, origin, explicit) {
  if (explicit === true || explicit === false) return explicit;
  return isExternalTarget(value, origin);
}

/**
 * Authoring hint only — does this look like someone typed a domain without `https://`?
 *
 * `example.com/page` is indistinguishable from a relative path, so it routes as internal
 * and always will. The builder uses this to *say so* and suggest adding the scheme; it
 * never changes where a link goes.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeBareDomain(value) {
  const v = String(value ?? "").trim();
  if (!v || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return false;
  if (v.startsWith("/") || v.startsWith(".") || v.startsWith("#") || v.startsWith("?")) return false;
  if (CONTENT_EXTENSIONS.test(v.split(/[/?#]/)[0])) return false;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(v.split(/[/?#]/)[0]);
}
