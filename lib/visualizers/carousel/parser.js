/**
 * carousel parser — pure function
 *
 * Input:  raw markdown inside a ::: carousel block (post link-resolution, so
 *         `![[photo.jpg]]` has already become `![](/media/photo.jpg)`; both forms
 *         are accepted so the same parser runs in Obsidian or a live preview).
 * Output: { items: [{ src, alt, caption }] }
 *
 * Grammar (plain markdown, reads fine in Obsidian):
 *   - every image line starts a slide;
 *   - text lines after an image, up to a blank line or the next image, are its caption;
 *   - a slide without a text line simply has no caption;
 *   - text before the first image is ignored.
 *
 * There are deliberately no `key: value` config lines: a caption such as
 * "Note: the old boilers" must never be read as a setting. Settings go on the
 * opener line (`::: carousel fit=cover`).
 */

const MD_IMAGE = /^!\[([^\]]*)\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)/;
const WIKI_IMAGE = /^!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/;

function readImage(line) {
  const md = line.match(MD_IMAGE);
  if (md) return { src: md[2], alt: md[1], rest: line.slice(md[0].length).trim() };
  const wiki = line.match(WIKI_IMAGE);
  if (wiki) {
    // `|300` is an Obsidian width, not alt text
    const pipe = wiki[2] && !/^\d+(x\d+)?$/.test(wiki[2].trim()) ? wiki[2].trim() : "";
    return { src: wiki[1].trim(), alt: pipe, rest: line.slice(wiki[0].length).trim() };
  }
  return null;
}

/**
 * @param {string} raw
 * @returns {{ items: { src: string, alt: string, caption: string }[] }}
 */
export function parse(raw) {
  const items = [];
  let current = null;
  let open = false; // still collecting caption lines for `current`

  for (const rawLine of String(raw || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) { open = false; continue; }

    const img = readImage(line);
    if (img) {
      current = { src: img.src, alt: img.alt, caption: img.rest };
      items.push(current);
      open = true;
      continue;
    }

    if (current && open) {
      current.caption = current.caption ? `${current.caption} ${line}` : line;
    }
  }

  return { items };
}
