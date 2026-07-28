/**
 * Per-page visualizer detection (TECH-DEBT #4).
 *
 * Every page currently loads every visualizer's CSS and JS. This module decides,
 * from a page's RENDERED HTML, which visualizer assets that page actually needs.
 *
 * PURE — no I/O, no DOM. Consumed by the `visualizer-assets` transform in
 * eleventy.config.js.
 *
 * ── Safety posture ────────────────────────────────────────────────────────────
 * Getting detection wrong means a page silently loses its styling or behavior,
 * which is far worse than shipping a few unused KB. So:
 *
 *   1. A visualizer is only ever SKIPPED if its manifest explicitly declares
 *      `detect.selectors`. No annotation → always loaded. Opt-in, not opt-out.
 *   2. `detect.always: true` documents shapes that genuinely cannot be detected
 *      (latex scans raw text for math; page-preview attaches to Pagefind results
 *      that only exist after search runs at runtime).
 *   3. The whole feature is behind a per-site flag; disabled reproduces today's
 *      behavior exactly.
 *
 * Matching is done on whole class/id tokens rather than raw substrings, so
 * `.collection-visualizer` does not match `collection-visualizer-legacy`.
 */

/** Escape a string for literal use inside a RegExp. */
function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does one selector appear in the rendered HTML?
 * Supports the three forms shapes actually use: `.class`, `#id`, `[attr]`.
 */
function selectorMatches(selector, html) {
  const sel = String(selector || "").trim();
  if (!sel) return false;

  if (sel.startsWith(".")) {
    // Tokenise every class attribute and compare whole names. Deliberately not
    // a substring test: `.collection-visualizer` must not match
    // `collection-visualizer-legacy`.
    const name = sel.slice(1);
    const attrRe = /\bclass=(?:"([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = attrRe.exec(html)) !== null) {
      const value = m[1] !== undefined ? m[1] : m[2];
      if (value && value.split(/\s+/).includes(name)) return true;
    }
    return false;
  }

  if (sel.startsWith("#")) {
    const id = escapeRe(sel.slice(1));
    return new RegExp(`\\bid=(?:"${id}"|'${id}')`).test(html);
  }

  if (sel.startsWith("[")) {
    const attr = sel.slice(1, sel.indexOf("]") === -1 ? undefined : sel.indexOf("]"));
    return new RegExp(`\\s${escapeRe(attr)}[=\\s>]`).test(html);
  }

  // Bare tag or anything else — fall back to a conservative presence check.
  return new RegExp(`<${escapeRe(sel)}[\\s>]`).test(html);
}

/**
 * Is this visualizer needed on a page with this HTML?
 * Unannotated visualizers return true — see the safety posture above.
 */
export function isVisualizerUsed(vis, html) {
  const detect = vis && vis.detect;
  if (!detect) return true;
  if (detect.always) return true;

  const selectors = Array.isArray(detect.selectors) ? detect.selectors : [];
  if (selectors.length === 0) return true;

  return selectors.some((sel) => selectorMatches(sel, html));
}

/**
 * Decide which visualizer assets a page needs.
 *
 * @param {Array}  visualizers - entries from visualizers.json ({name, hasCss, hasJs, detect})
 * @param {string} html        - the page's fully rendered HTML
 * @param {{enabled?: boolean}} options - when disabled, returns everything (today's behavior)
 * @returns {{css: string[], js: string[], skipped: string[]}}
 */
export function detectVisualizers(visualizers, html, options = {}) {
  const enabled = options.enabled === true;
  const list = Array.isArray(visualizers) ? visualizers : [];

  const css = [];
  const js = [];
  const skipped = [];

  for (const vis of list) {
    if (!vis || (!vis.hasCss && !vis.hasJs)) continue;

    const used = enabled ? isVisualizerUsed(vis, html) : true;
    if (!used) {
      skipped.push(vis.name);
      continue;
    }
    if (vis.hasCss) css.push(vis.name);
    if (vis.hasJs) js.push(vis.name);
  }

  return { css, js, skipped };
}

/**
 * Build the <link> / <script> markup for the chosen visualizers.
 * `urlPrefix` carries any mount_path (e.g. "/marbles/").
 */
export function renderAssetTags(cssNames, jsNames, urlPrefix = "/") {
  const prefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;

  const css = (cssNames || [])
    .map((n) => `<link rel="stylesheet" href="${prefix}assets/css/visualizers/${n}.css">`)
    .join("\n    ");

  const js = (jsNames || [])
    .map((n) => `<script src="${prefix}assets/js/visualizers/${n}.js"></script>`)
    .join("\n    ");

  return { css, js };
}
