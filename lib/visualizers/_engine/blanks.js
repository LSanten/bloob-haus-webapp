/**
 * The blanks a visualizer's templates can use, sorted into outside and inside.
 *
 * The outside is what the note's frontmatter says: anyone may see it, even when the note is
 * locked (encrypted) or sealed (not opened yet). The inside is everything taken from the body.
 * A locked note cannot be read and a sealed one should not be, so both get no inside at all.
 *
 * Pure: no files, no DOM, no network. Runs at build time, in the editor and in the browser.
 */

const FIRST_LINES_MAX = 280;

/**
 * @param {{ data: object, html: string, url: string, pageId: string }} note
 * @param {{ locked?: boolean, sealed?: boolean }} [opts]
 * @returns {{ outside: object, inside: object | null }}
 */
export function deriveBlanks(note, { locked = false, sealed = false } = {}) {
  const data = note.data || {};
  // An image the builder took from the body (marked image_source: body) is inside data.
  const imageFromBody = data.image_source === "body";
  const outside = {
    title: data.title,
    subtitle: data.subtitle,
    color: data.color,
    image: imageFromBody ? undefined : data.image ?? data.cover,
    yaml: data,
  };
  if (locked || sealed) return { outside, inside: null };
  return {
    outside,
    inside: {
      body: note.html || "",
      firstLines: firstLines(note.html || ""),
      image: imageFromBody ? data.image : undefined,
    },
  };
}

function firstLines(html) {
  const paragraphs = [...html.matchAll(/<p[\s>][\s\S]*?<\/p>/gi)].map((m) => m[0]);
  const text = plainText(paragraphs.length ? paragraphs.join(" ") : html);
  if (text.length <= FIRST_LINES_MAX) return text;
  const cut = text.slice(0, FIRST_LINES_MAX + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).trimEnd();
}

function plainText(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
