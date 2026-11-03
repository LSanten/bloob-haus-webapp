/**
 * The markdown a visitor gets from "copy markdown": the note as written, minus what was never
 * meant to leave the vault. %% comments go, links to notes that aren't published become plain
 * text (they would lead nowhere, and their names may be private), embeds of them are dropped,
 * HTML comments go as the site hides them, and the frontmatter keeps only
 * the title.
 */

import { stripComments } from "./comment-stripper.js";

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

  text = stripComments(text).replace(/%%[\s\S]*?%%/g, ""); // as the site hides them

  // ![[Note]] embeds of notes that aren't published are dropped (pictures and files stay).
  text = text.replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (all, target) =>
    /\.[a-z0-9]{2,5}$/i.test(target.trim()) || publishedSlugs.has(noteSlug(target)) ? all : "",
  );

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
