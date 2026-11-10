/**
 * Redirects for date-prefixed notes (`url.date_redirect`, on by default).
 *
 * A note named "2026-11-07 Aden Bday" has two plausible URLs: with the date and
 * without it. `url.date_prefix` decides which one is real; this writes a
 * Cloudflare Pages `_redirects` rule sending the other one there, so links shared
 * in either form keep working (and links shared before a date_prefix change, or
 * before the space-separator fix of 2026-11-10, still land).
 *
 * Cloudflare follows a `_redirects` rule even when a real file sits at that path,
 * so a rule is only written when the alias is no other page's URL. The file
 * itself is never served, so unlisted pages are safe to include.
 */
import fs from "fs-extra";
import path from "path";

/**
 * @param {Object} pages - fileIndex.pages (pageInfo objects with url / dateAliasUrl)
 * @param {Object} [options]
 * @param {Set<string>} [options.published] - relativePaths actually built; pages
 *        outside it (status_field drafts) get no redirect
 * @returns {Array<{from: string, to: string}>}
 */
export function buildDateRedirects(pages, options = {}) {
  const all = Object.values(pages || {});
  const realUrls = new Set(all.map((p) => p.url));

  const byAlias = new Map();
  for (const p of all) {
    if (!p.dateAliasUrl) continue;
    if (options.published && !options.published.has(p.relativePath)) continue;
    if (p.frontmatter?.permalink != null) continue;
    if (realUrls.has(p.dateAliasUrl)) continue;
    const list = byAlias.get(p.dateAliasUrl) || [];
    list.push(p.url);
    byAlias.set(p.dateAliasUrl, list);
  }

  const rules = [];
  for (const [from, targets] of byAlias) {
    if (targets.length === 1) rules.push({ from, to: targets[0] });
  }
  return rules.sort((a, b) => a.from.localeCompare(b.from));
}

/**
 * @param {Array<{from: string, to: string}>} rules
 * @param {string} [mountPath]
 * @returns {string} `_redirects` lines (slash and no-slash source per rule)
 */
export function formatRedirects(rules, mountPath) {
  const prefix = mountPath ? `/${mountPath.replace(/^\/|\/$/g, "")}` : "";
  return rules
    .map(({ from, to }) => {
      const src = `${prefix}${from}`;
      const dst = `${prefix}${to}`;
      const lines = [`${src} ${dst} 301`];
      if (src.endsWith("/") && src.length > 1) lines.push(`${src.slice(0, -1)} ${dst} 301`);
      return lines.join("\n");
    })
    .map((l) => `${l}\n`)
    .join("");
}

/**
 * Appends the rules to `<deployDir>/_redirects` (never overwrites existing rules).
 * @param {string} deployDir - the folder Cloudflare Pages deploys (`_site`)
 * @param {Array<{from: string, to: string}>} rules
 * @param {string} [mountPath]
 */
export async function writeRedirects(deployDir, rules, mountPath) {
  if (!rules || rules.length === 0) return;
  const file = path.join(deployDir, "_redirects");
  const existing = (await fs.pathExists(file)) ? await fs.readFile(file, "utf-8") : "";
  const body = `# url.date_redirect\n${formatRedirects(rules, mountPath)}`;
  const joined = existing && !existing.endsWith("\n") ? `${existing}\n` : existing;
  await fs.writeFile(file, existing ? `${joined}${body}` : body);
}
