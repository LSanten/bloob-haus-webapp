/**
 * Callouts: a quote that starts with `[!type]` becomes a callout box, as in Obsidian and GitHub
 * (`> [!question] Title`, `> [!NOTE]`, `> [!tip]`, `> [!warning]` ...). The rest of the first line
 * is its title (else the type, capitalised); the following lines are its body. An ordinary quote
 * stays a quote. Built at markdown time: real HTML, no script, readable in every host.
 *
 * Syntax note (DECISIONS): `> [!type]` was rejected as the way to write visualizer blocks; as a
 * plain writing rule for callouts it is the community standard and reads fine as a quote anywhere.
 */
export const type = "hybrid";
export const name = "callout";

const MARKER = /^\[!([A-Za-z][\w-]*)\]([+-]?)[ \t]*([^\n]*)\n?/;

export function markdownItPlugin(md) {
  md.core.ruler.before("inline", "callout", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "blockquote_open") continue;
      const p = tokens[i + 1], inline = tokens[i + 2];
      if (!p || p.type !== "paragraph_open" || !inline || inline.type !== "inline") continue;
      const m = MARKER.exec(inline.content);
      if (!m) continue;
      const kind = m[1].toLowerCase();
      const title = m[3].trim() || kind.charAt(0).toUpperCase() + kind.slice(1);
      const rest = inline.content.slice(m[0].length);

      // the quote becomes the callout
      tokens[i].tag = "aside";
      tokens[i].attrs = [["class", `callout callout--${kind}`], ["data-callout", kind]];
      let depth = 0;
      for (let j = i; j < tokens.length; j++) {
        if (tokens[j].type === "blockquote_open") depth++;
        if (tokens[j].type === "blockquote_close" && --depth === 0) { tokens[j].tag = "aside"; break; }
      }
      // the first line becomes its title; the rest of that paragraph, its first body paragraph
      p.attrs = [["class", "callout__title"]];
      inline.content = title;
      if (rest.trim()) {
        const open = new state.Token("paragraph_open", "p", 1);
        const body = new state.Token("inline", "", 0);
        body.content = rest;
        body.children = [];
        body.map = inline.map;
        const close = new state.Token("paragraph_close", "p", -1);
        open.block = close.block = body.block = true;
        tokens.splice(i + 4, 0, open, body, close);
      }
    }
  });
}
