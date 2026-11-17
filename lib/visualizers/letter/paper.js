// @ts-check
/**
 * paper.js — the letter's open state: the sheet inside, and the rules for what may be written on
 * it. Pure: markdown in, HTML string out, so it runs the same on a server, in a browser and in the
 * visualizer editor. Its look is .bh-paper in styles.css beside this file.
 *
 * HOME: bloob-haus-webapp/lib/visualizers/letter/ (one home for drawing code, 2026-11-16). Born in
 * the post office as app/src/shapes/note/render.ts and NoteShape.tsx.
 *
 * The paper is plain: it holds only what the writer typed. Nothing is added from the envelope, no
 * greeting and no signature (Leon, 2026-09-21: the page must not claim the author signed off).
 *
 * What a letter refuses, for the reader's privacy: raw HTML is shown as text; an image becomes its
 * alt text, never a request (a remote image is a read receipt); javascript:, vbscript: and file:
 * links are not links (markdown-it's validateLink). Every link gets rel=noopener.
 */
import MarkdownIt from "markdown-it";

// breaks:true: a letter is not a document. People press Enter where they mean a new line, and a
// single newline must show as one. linkify:true: a pasted URL becomes a link.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

// images → <span class="img-alt">alt</span>
md.renderer.rules.image = (tokens, idx, opts, env, self) => {
  const alt = self.renderInlineAsText(tokens[idx].children ?? [], opts, env);
  return `<span class="img-alt">${md.utils.escapeHtml(alt)}</span>`;
};

// links → rel="noopener"; a link to another host also opens a new tab and sends no referrer
// (ui-principles #15: a link that leaves this subdomain opens a new tab). Where the page is drawn
// is injected (`here`, a host), so the renderer stays pure (shapes.md, authoring convention #7).
const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const href = tokens[idx].attrGet("href") ?? "";
  if (leavesHost(href, env?.here)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
  } else tokens[idx].attrSet("rel", "noopener");
  return defaultLinkOpen(tokens, idx, opts, env, self);
};

/**
 * A web address on another host than `here`; without `here`, every web address counts as elsewhere.
 * @param {string} href
 * @param {string | undefined} here
 * @returns {boolean}
 */
function leavesHost(href, here) {
  let url;
  try { url = new URL(href); } catch { return false; }   // relative: this site
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;   // mailto:, tel: hand over in place
  return !here || url.host !== here;
}

/**
 * The words on the paper. `here` is the host the page is drawn on (location.host), so links to it
 * stay in the tab.
 * @param {string} markdown
 * @param {string} [here]
 * @returns {string}
 */
export function renderPaperBody(markdown, here) {
  return md.render(markdown, { here });
}

/**
 * The open sheet: the day it was written (the envelope's date_created, when there is one) and the
 * words. Nothing else from the envelope goes on the paper.
 * @param {Record<string, string>} envelope
 * @param {string} markdown
 * @param {{ here?: string }} [where]
 * @returns {string}
 */
export function renderPaper(envelope, markdown, { here } = {}) {
  const date = envelope.date_created ? `<p class="bh-paper__date">${md.utils.escapeHtml(envelope.date_created)}</p>` : "";
  return `<article class="bh-paper">${date}<div class="note-body bh-paper__body">${renderPaperBody(markdown, here)}</div></article>`;
}
