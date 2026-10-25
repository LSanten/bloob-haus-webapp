/**
 * `features.show_in_search: no` — the part a theme head can't reach.
 *
 * robots-meta.njk puts `noindex` into every page the theme renders. Magic machines and raw
 * HTML are copied as-is, and PDFs and images have no <head> at all, so Cloudflare Pages
 * gets the same answer as an X-Robots-Tag header for every path. Appended, never
 * overwritten: `_headers` may already hold rules (lib/magic-machines/_headers).
 */
import fs from "fs-extra";
import path from "path";

/**
 * @param {string} deployDir  the folder Cloudflare Pages deploys (`_site`)
 * @param {string} [mountPath]  the site's mount_path, if it lives under one
 */
export async function addNoindexHeader(deployDir, mountPath) {
  const file = path.join(deployDir, "_headers");
  const existing = (await fs.pathExists(file)) ? await fs.readFile(file, "utf-8") : "";
  const scope = mountPath ? `/${mountPath.replace(/^\/|\/$/g, "")}/*` : "/*";
  const rule = `# features.show_in_search: no\n${scope}\n  X-Robots-Tag: noindex, nofollow\n`;
  const joined = existing && !existing.endsWith("\n") ? `${existing}\n` : existing;
  await fs.writeFile(file, existing ? `${joined}\n${rule}` : rule);
}
