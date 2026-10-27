/**
 * Foldable headings: the `## > Heading` shortcut, as a markdown-it plugin.
 *
 *   ## > Title     folded: only the heading shows, click to open its section
 *   ## ^ Title     open, but can be folded
 *   ## >Title      the space after the marker is optional
 *
 * A section runs from its heading to the next heading of the same or a higher
 * level (fewer #), or to the end of whatever contains it (the page, a `:::`
 * block, a blockquote, a list item). Folds nest. The marker never appears in
 * the rendered title.
 *
 * Output is plain HTML, decided at build time, so it works without JavaScript,
 * is keyboard accessible, and the folded text stays in the page for search
 * engines, Pagefind and the browser's find-in-page:
 *
 *   <details class="bloob-fold" data-fold-level="2">
 *     <summary class="bloob-fold__summary"><h2>Title</h2><span class="bloob-fold__peek" …></span></summary>
 *     <div class="bloob-fold__body"> …section… </div>
 *   </details>
 *
 * WHY A TOKEN TRANSFORM AND NOT A `:::foldable` REWRITE
 * The 2026-05-31 plan proposed rewriting `## > Heading` into `::: foldable`
 * blocks before markdown-it runs. That collides with the container machinery:
 * markdown-it-container closes a block at the first bare `:::`, so a fold that
 * contains any `:::` block (a collection, an image grid) or another fold would be
 * cut short, and inject-container-raw.js counts `::::` closers as openers. Working
 * on markdown-it's token stream avoids all of that: code fences, blockquotes and
 * `:::` blocks are already tokens here, so a `## >` line inside a code block can
 * never fold, and a fold can never cross the edge of the block it sits in.
 *
 * Prior art: _plugins/collapsible_converter.rb in Leon's Jekyll site (same marker
 * grammar and the same "next heading of the same or higher level" rule).
 *
 * PURE: no DOM, no I/O. Registered by eleventy.config.js through the
 * `markdownItPlugin` export of index.js.
 */

/** `>` folded, `^` open. The title must not be empty after the marker. */
const MARKER_RE = /^([>^])[ \t]*(?=\S)/;

/**
 * Read a fold marker from a heading's raw inline text.
 * Returns { open, rest } or null when the heading is not a fold.
 *
 * Uses the RAW inline source, so an escaped `## \> Title` is not a fold.
 */
export function parseFoldMarker(text) {
  const m = MARKER_RE.exec(String(text ?? ""));
  if (!m) return null;
  return { open: m[1] === "^", rest: String(text).slice(m[0].length) };
}

function headingLevel(token) {
  return Number(token.tag.slice(1)) || 0;
}

/**
 * Pass 1: find every fold and where it ends.
 * Returns [{ start, end, hLevel, depth, open }], `end` exclusive.
 *
 * `depth` is the token nesting level the heading sits at. A fold only ever
 * contains tokens at that depth or deeper, so it closes:
 *   - before the closing token of its parent block (level drops below depth)
 *   - at the next heading AT THE SAME DEPTH whose level is the same or higher
 *   - before the footnotes block markdown-it-footnote appends at the very end
 *   - at the end of the document
 */
export function findFolds(tokens) {
  const folds = [];
  const stack = [];
  const close = (end) => {
    const fold = stack.pop();
    fold.end = end;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    while (stack.length && t.level < stack[stack.length - 1].depth) close(i);

    if (t.type === "footnote_block_open") {
      while (stack.length) close(i);
      continue;
    }

    if (t.type !== "heading_open") continue;

    const hLevel = headingLevel(t);
    while (
      stack.length &&
      stack[stack.length - 1].depth === t.level &&
      stack[stack.length - 1].hLevel >= hLevel
    ) {
      close(i);
    }

    const inline = tokens[i + 1];
    if (!inline || inline.type !== "inline") continue;
    const marker = parseFoldMarker(inline.content);
    if (!marker) continue;

    const fold = { start: i, end: tokens.length, hLevel, depth: t.level, open: marker.open };
    stack.push(fold);
    folds.push(fold);
  }

  while (stack.length) close(tokens.length);
  return folds;
}

/**
 * Remove the marker from a heading's inline token and its first text child.
 * The child can hold the marker alone (`> ` before `**bold**`), so it is
 * stripped without the "title follows" lookahead the detection needs.
 */
function stripMarker(inline) {
  inline.content = inline.content.replace(MARKER_RE, "");
  const first = inline.children && inline.children[0];
  if (first && first.type === "text") {
    first.content = first.content.replace(/^[>^][ \t]*/, "");
  }
}

function htmlToken(state, content, level) {
  const token = new state.Token("html_block", "", 0);
  token.content = content;
  token.level = level;
  token.block = true;
  return token;
}

/** Markup around a fold. Kept here so tests and the renderer agree. */
export function foldOpenHtml({ hLevel, open }) {
  return (
    `<details class="bloob-fold" data-fold-level="${hLevel}"${open ? " open" : ""}>\n` +
    `<summary class="bloob-fold__summary">`
  );
}
export const FOLD_PEEK_PLACEHOLDER = `<span class="bloob-fold__peek" aria-hidden="true"></span>`;
export const FOLD_SUMMARY_CLOSE = `${FOLD_PEEK_PLACEHOLDER}</summary>\n<div class="bloob-fold__body">\n`;
export const FOLD_CLOSE = `</div>\n</details>\n`;

/**
 * The core rule: wrap every marked heading's section in <details>.
 */
export function foldHeadingsRule(state) {
  const tokens = state.tokens;
  const folds = findFolds(tokens);
  if (!folds.length) return;

  const starts = new Map();
  const ends = new Map();
  for (const fold of folds) {
    stripMarker(tokens[fold.start + 1]);
    // A marked heading with nothing under it has nothing to fold: render it as
    // a plain heading (marker removed) rather than a toggle that opens to nothing.
    if (fold.end <= fold.start + 3) continue;
    starts.set(fold.start, fold);
    if (!ends.has(fold.end)) ends.set(fold.end, []);
    ends.get(fold.end).push(fold);
  }
  if (!starts.size) return;

  // Inner folds open later, so they must close first.
  for (const list of ends.values()) list.sort((a, b) => b.start - a.start);

  const out = [];
  for (let i = 0; i <= tokens.length; i++) {
    for (const fold of ends.get(i) || []) out.push(htmlToken(state, FOLD_CLOSE, fold.depth));
    if (i === tokens.length) break;

    const fold = starts.get(i);
    if (fold) {
      out.push(htmlToken(state, foldOpenHtml(fold), fold.depth));
      out.push(tokens[i], tokens[i + 1], tokens[i + 2]);
      out.push(htmlToken(state, FOLD_SUMMARY_CLOSE, fold.depth));
      i += 2;
      continue;
    }
    out.push(tokens[i]);
  }
  state.tokens = out;
}

/**
 * markdown-it plugin entry.
 *
 * @param {import("markdown-it")} md
 * @param {{ enabled?: boolean }} [options] - `enabled: false` turns the plugin
 *   into a no-op (sites opt out with `features.foldable_headings: false`).
 */
export function foldHeadingsPlugin(md, options = {}) {
  if (options.enabled === false) return;
  // Pushed last, so it runs after inline parsing, markdown-it-attrs and the
  // footnote tail: headings are complete and footnotes are already appended.
  md.core.ruler.push("bloob_fold_headings", foldHeadingsRule);
}
