/**
 * The markdown a visitor gets from "copy markdown": the note as written, minus what was never
 * meant to leave the vault. %% comments go, links to notes that aren't published become plain
 * text (they would lead nowhere, and their names may be private), embeds of them are dropped,
 * HTML comments go as the site hides them, and the frontmatter keeps only
 * the title and the dates the page shows. Pictures point at the files the site serves
 * (absolute URLs), so the copied note still shows them in any other app.
 */

import { stripComments } from "./comment-stripper.js";
import { parseDateField } from "./date-field.js";

/** A date field as the page shows it (latest of a list, label dropped) → YYYY-MM-DD, or null. */
const dayOf = (raw) => {
  const { value } = parseDateField(raw);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const m = /\d{4}-\d{2}-\d{2}/.exec(String(value ?? ""));
  return m ? m[0] : null;
};

const noteSlug = (target) =>
  decodeURIComponent(String(target).split("#")[0].split("/").pop() || "")
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();

const isExternal = (href) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#");

export function cleanMarkdownForSharing(md, { publishedSlugs, dates = {}, siteUrl = null, resolveImage = null }) {
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

  // Pictures: the site's own files become absolute URLs; anything not found stays as written.
  if (siteUrl && resolveImage) {
    const publicUrl = (ref) => {
      const p = resolveImage(ref);
      return p ? new URL(p, siteUrl.replace(/\/?$/, "/")).href : null;
    };
    text = text.replace(/!\[\[([^\]|]+\.[a-z0-9]{2,5})(?:\|([^\]]*))?\]\]/gi, (all, target, alias) => {
      const url = publicUrl(target.trim());
      const alt = alias && !/^\d+(x\d+)?$/.test(alias.trim()) ? alias.trim() : "";
      return url ? `![${alt}](${url})` : all;
    });
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (all, alt, href) => {
      if (isExternal(href) || href.startsWith("/")) return all;
      const url = publicUrl(href);
      return url ? `![${alt}](${url})` : all;
    });
  }

  const created = dayOf(dates.created);
  const updated = dayOf(dates.updated);
  const head = [
    title,
    created && `date_created: ${created}`,
    updated && updated !== created && `date_updated: ${updated}`,
  ].filter(Boolean);
  return head.length ? `---\n${head.join("\n")}\n---\n${text}` : text;
}
