/**
 * Collection parser: a hand-written list of pages inside the block.
 *
 * PURE. No DOM, no I/O, no YAML: it only separates the two kinds of line a
 * collection block can hold and reads the links out of the list lines. The
 * host (index.js) parses the remaining settings text as YAML, exactly as it
 * always has for a fence without a list.
 *
 *   :::collection                       ```collection
 *   display: cards                      source: folder=projects
 *   - [[PAGE-NAME]]                     ```
 *   - [[PAGE-NAME|Label]]
 *   - [Title](marbles/PAGE.md)
 *   - [A website](https://example.org)
 *   :::
 *
 * A LIST LINE is a bullet (`-`, `*`, `+`) whose text starts with a link. Every
 * other line is settings text. That rule keeps an ordinary YAML list such as
 *   show_fields:
 *     - building_type
 * on the settings side, because `building_type` is not a link.
 *
 * Links arrive in two states and both are accepted:
 *   - authored, straight from a vault or the playground: `[[PAGE]]`,
 *     `[Title](marbles/PAGE.md)`
 *   - already resolved by the preprocessor (wiki-link-resolver /
 *     markdown-link-resolver): `[PAGE](/marbles/PAGE/)`, or
 *     `<span class="broken-link" …>PAGE</span>` for a page that is private or
 *     missing. A broken link yields an item marked `broken`, so the host can
 *     skip it without ever printing the private page's name.
 */

const BULLET_RE = /^\s*[-*+]\s+(.*\S)\s*$/;
const WIKI_RE = /^!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/;
const MD_LINK_RE = /^\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\s*\)/;
const BROKEN_RE = /^<span class="broken-link"[^>]*>([\s\S]*?)<\/span>/;
const BARE_URL_RE = /^(https?:\/\/[^\s<>]+)/;

/**
 * Read the link at the start of a list item's text.
 * @returns {{ target: string, label: string|null, broken?: true }|null}
 */
export function parseItemText(text) {
  const s = String(text ?? "").trim();
  let m;
  if ((m = WIKI_RE.exec(s))) {
    return { target: m[1].trim(), label: m[2] ? m[2].trim() : null };
  }
  if ((m = MD_LINK_RE.exec(s))) {
    const label = m[1].trim();
    return { target: (m[2] ?? m[3]).trim(), label: label || null };
  }
  if ((m = BROKEN_RE.exec(s))) {
    return { target: "", label: m[1].trim() || null, broken: true };
  }
  if ((m = BARE_URL_RE.exec(s))) {
    return { target: m[1], label: null };
  }
  return null;
}

/**
 * Split a collection block into settings text and list items.
 * @param {string} raw - the block's inner text
 * @returns {{ settingsText: string, items: Array<{target: string, label: string|null, broken?: true}> }}
 */
export function splitCollectionBlock(raw) {
  const settingsLines = [];
  const items = [];
  for (const line of String(raw ?? "").split("\n")) {
    const bullet = BULLET_RE.exec(line);
    const item = bullet ? parseItemText(bullet[1]) : null;
    if (item) items.push(item);
    else settingsLines.push(line);
  }
  return { settingsText: settingsLines.join("\n"), items };
}

/**
 * Best-effort `key: value` reader, used by the host only when the settings
 * text is not valid YAML (a stray line of prose inside a `:::collection`
 * block, say). One line, one setting; anything else is ignored.
 */
export function parseLooseSettings(text) {
  const settings = {};
  for (const line of String(text ?? "").split("\n")) {
    const m = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/.exec(line);
    if (m && m[2] !== "") settings[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return settings;
}
