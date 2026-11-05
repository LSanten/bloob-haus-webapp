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

const SIZE = /^(\d+)(?:x(\d+))?$/;

/** Obsidian's "|611" / "|611x400" after an image is a display size, not alt text. After
 *  link resolution "![[a.png|611]]" arrives here as "![611](/media/a.png)". */
function readSize(text) {
  const m = String(text || "").trim().match(SIZE);
  return m ? { width: Number(m[1]), ...(m[2] ? { height: Number(m[2]) } : {}) } : null;
}

function readImage(line) {
  const md = line.match(MD_IMAGE);
  if (md) {
    const size = readSize(md[1]);
    return { src: md[2], alt: size ? "" : md[1], size, rest: line.slice(md[0].length).trim() };
  }
  const wiki = line.match(WIKI_IMAGE);
  if (wiki) {
    const size = readSize(wiki[2]);
    return { src: wiki[1].trim(), alt: size ? "" : (wiki[2] || "").trim(), size, rest: line.slice(wiki[0].length).trim() };
  }
  return null;
}

/**
 * @param {string} raw
 * @returns {{ items: { src: string, alt: string, caption: string, size?: { width: number, height?: number } }[] }}
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
      if (img.size) current.size = img.size;
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
