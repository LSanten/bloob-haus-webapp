/**
 * Page excerpt: the first words of a page's prose, as plain text.
 *
 * Used for post cards (`collection` with `show: excerpt`). Runs in the
 * preprocessor on the page body after links are resolved and the title heading
 * is removed, so it sees roughly what a reader sees first.
 *
 * Kept: paragraphs, list items, blockquotes (markers removed, links reduced to
 * their text). Skipped: headings, images, code, tables, HTML blocks, footnote
 * definitions, bare URLs, and whole `:::` blocks (their insides are data for a
 * shape: link lists, tables, settings).
 *
 * Same idea as excerpt_generator.rb on Leon's Jekyll site.
 * Pure: string in, string out.
 */

/** Words kept per page. A card shows fewer (`excerpt_length`, default 30). */
export const EXCERPT_MAX_WORDS = 60;

function cleanInline(text) {
  return (
    text
      // images first, so their alt text does not survive as a "link"
      .replace(/!\[\[[^\]]*\]\]/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // wiki links: [[target|label]] → label, [[target]] → target
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      // footnote references
      .replace(/\[\^[^\]]+\]/g, "")
      // markdown links → their text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // HTML tags (a broken-link span keeps its text)
      .replace(/<[^>]+>/g, "")
      // bare URLs
      .replace(/\bhttps?:\/\/\S+/g, "")
      // attribute blocks from markdown-it-attrs: {.button} {#id}
      .replace(/\{[.#][^}]*\}/g, "")
      // emphasis, highlight, strikethrough, inline code markers
      .replace(/(\*\*|__|==|~~)(.+?)\1/g, "$2")
      .replace(/(^|[^\w*])[*_](?=\S)(.+?)(?<=\S)[*_](?![\w*])/g, "$1$2")
      .replace(/`([^`]*)`/g, "$1")
      // inline tags: #topic → topic
      .replace(/(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu, "$1$2")
  );
}

/**
 * @param {string} markdown - page body
 * @param {{ maxWords?: number }} [options]
 * @returns {string} plain text, at most maxWords words ("" when the page has no prose)
 */
export function extractExcerpt(markdown, { maxWords = EXCERPT_MAX_WORDS } = {}) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const kept = [];
  let fence = null; // the ``` or ~~~ that opened a code block
  let blockDepth = 0; // inside :::  blocks
  let words = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      continue;
    }

    if (/^:::/.test(line)) {
      if (/^:::+\s*$/.test(line)) blockDepth = Math.max(0, blockDepth - 1);
      else blockDepth++;
      continue;
    }
    if (blockDepth > 0) continue;

    if (!line) continue;
    if (/^#{1,6}(\s|$)/.test(line)) continue; // heading
    if (/^(!\[|<)/.test(line)) continue; // image or HTML block
    if (/^\|/.test(line)) continue; // table
    if (/^([-*_])(\s*\1){2,}$/.test(line)) continue; // horizontal rule
    if (/^\[\^[^\]]+\]:/.test(line)) continue; // footnote definition
    if (/^(https?:\/\/\S+)$/.test(line)) continue; // bare URL on its own line

    const text = cleanInline(
      line
        .replace(/^(>\s*)+/, "") // blockquote
        .replace(/^\[![\w-]+\][+-]?\s*/, "") // Obsidian callout marker: [!info], [!warning]-
        .replace(/^([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, "") // list item, task box
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;

    kept.push(text);
    words += text.split(" ").length;
    if (words >= maxWords) break;
  }

  const all = kept.join(" ").split(" ").filter(Boolean);
  return all.slice(0, maxWords).join(" ");
}
