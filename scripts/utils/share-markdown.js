/**
 * The markdown a visitor gets from "copy markdown": the note as written, minus what was never
 * meant to leave the vault. %% comments go, links to notes that aren't published become plain
 * text (they would lead nowhere, and their names may be private), and the frontmatter keeps only
 * the title.
 */

const noteSlug = (target) =>
  decodeURIComponent(String(target).split("#")[0].split("/").pop() || "")
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();

const isExternal = (href) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#");

export function cleanMarkdownForSharing(md, { publishedSlugs }) {
  let text = String(md);
  let title = null;

  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (fm) {
    const line = fm[1].split(/\r?\n/).find((l) => /^title\s*:/.test(l));
    title = line ? line.trim() : null;
    text = text.slice(fm[0].length);
  }

  text = text.replace(/%%[\s\S]*?%%/g, "");

  // [[Note]] and [[Note|shown words]]; embeds (![[...]]) stay as they are.
  text = text.replace(/(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (all, bang, target, alias) =>
    bang || publishedSlugs.has(noteSlug(target)) ? all : (alias ?? target).trim(),
  );

  // [words](note.md); web links and pictures stay.
  text = text.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (all, bang, words, href) => {
    if (bang || isExternal(href)) return all;
    return publishedSlugs.has(noteSlug(href)) ? all : words;
  });

  return title ? `---\n${title}\n---\n${text}` : text;
}
