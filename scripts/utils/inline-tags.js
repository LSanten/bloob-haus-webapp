/**
 * inline-tags.js — an Obsidian-style #tag written in the text stays where it is and becomes a
 * link to its tag page (Leon's feedback 59526537). A markdown-it plugin, registered by
 * markdown-setup.js when a site turns on `features.inline_tag_links`.
 *
 * It works on markdown-it's token stream, so code, links and URLs (already their own tokens) are
 * never touched. What counts as a tag is exactly what tag-extractor.js counts (a letter after #,
 * at the start of a line or after a space; system tags left out), so every link it makes has a
 * tag page behind it. Pure and browser-safe: no fs, no Node built-ins.
 */
import { isPublicTag, slugifyTag } from "./tag-extractor.js";

const TAG = /(^|\s)#([a-zA-Z][\w/-]*)/g;

/**
 * @param {import("markdown-it")} md
 * @param {{ prefix?: string }} options  prefix: the site's mount path ("/leon"), or ""
 */
export function inlineTagsPlugin(md, { prefix = "" } = {}) {
  const base = prefix ? `/${String(prefix).replace(/^\/+|\/+$/g, "")}` : "";
  // Before text_join: an escaped \# is still its own token there, so it can't pass for a tag.
  md.core.ruler.before("text_join", "inline_tags", (state) => {
    for (const block of state.tokens) {
      if (block.type !== "inline" || !block.children?.length) continue;
      const kids = block.children;
      const out = [];
      let inLink = 0;
      for (let i = 0; i < kids.length; i++) {
        const tok = kids[i];
        if (tok.type === "link_open") inLink++;
        else if (tok.type === "link_close") inLink--;
        if (tok.type !== "text" || inLink > 0 || !tok.content.includes("#")) {
          out.push(tok);
          continue;
        }
        const prev = kids[i - 1];
        const startsFresh = !prev || prev.type === "softbreak" || prev.type === "hardbreak" || (prev.type === "text" && /\s$/.test(prev.content));
        out.push(...splitTags(state, tok, startsFresh, base));
      }
      block.children = out;
    }
  });
}

function splitTags(state, tok, startsFresh, base) {
  const text = tok.content;
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(TAG)) {
    const [whole, space, name] = m;
    if (m.index === 0 && !space && !startsFresh) continue; // glued to what came before (**x**#y)
    if (!isPublicTag(name)) continue;
    const at = m.index + space.length;
    if (at > last) parts.push(textToken(state, text.slice(last, at)));
    const open = new state.Token("link_open", "a", 1);
    open.attrs = [["href", `${base}/tags/${slugifyTag(name.toLowerCase())}/`], ["class", "tag-inline"]];
    open.markup = "tag";
    parts.push(open, textToken(state, `#${name}`), Object.assign(new state.Token("link_close", "a", -1), { markup: "tag" }));
    last = m.index + whole.length;
  }
  if (!parts.length) return [tok];
  if (last < text.length) parts.push(textToken(state, text.slice(last)));
  return parts;
}

function textToken(state, content) {
  const t = new state.Token("text", "", 0);
  t.content = content;
  return t;
}
