/**
 * Folder-index template — resolution and placeholder substitution.
 *
 * When a content folder has no author-written `index.md` / `_index.md`, the
 * preprocessor generates one. That generated body used to be a hard-coded HTML
 * string containing a visualizer's container div, which meant folder indexes
 * silently opted out of everything the shape system guarantees — and duplicated
 * knowledge of markup owned by a stylesheet elsewhere. It is now a real
 * markdown template that COMPOSES A SHAPE.
 *
 * Precedence, highest first:
 *   1. the author's own `index.md` / `_index.md` in the vault  (handled by the
 *      caller — it simply never asks for a template in that case)
 *   2. `themes/<theme>/templates/folder-index.md`
 *   3. `themes/_base/templates/folder-index.md`
 *
 * Substitution happens HERE, at generation time, rather than being left to
 * Eleventy. That is deliberate: `graph.json`'s `section` is slugified, so a
 * template that interpolated a raw folder name would produce `folder=Resources`
 * and match nothing *silently*. Baking the slug in at write time removes the
 * trap, and keeps author markdown free of `{{ }}` evaluation hazards.
 *
 * See themes/_base/templates/README.md.
 */

import fs from "fs-extra";
import path from "path";

export const TEMPLATE_NAME = "folder-index.md";

/**
 * Resolve which folder-index template to use for a theme.
 *
 * @param {string} themesDir - absolute path to themes/
 * @param {string} themeName - active theme, e.g. "melt"
 * @returns {string|null} absolute path, or null when neither exists
 */
export function resolveFolderIndexTemplate(themesDir, themeName) {
  const candidates = [
    themeName && path.join(themesDir, themeName, "templates", TEMPLATE_NAME),
    path.join(themesDir, "_base", "templates", TEMPLATE_NAME),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Substitute `{{ placeholder }}` values. Whitespace inside the braces is
 * optional, so both `{{slug}}` and `{{ slug }}` work.
 *
 * Unknown placeholders are left untouched rather than blanked — a visible
 * `{{ typo }}` in the output is far easier to diagnose than a silently empty
 * value, which is the exact failure mode this module exists to prevent.
 *
 * @param {string} template
 * @param {Record<string,string>} vars
 * @returns {string}
 */
export function renderFolderIndexTemplate(template, vars = {}) {
  return String(template).replace(
    /\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi,
    (match, key) => (key in vars ? String(vars[key]) : match),
  );
}

/**
 * Derive the human-readable folder name from a slug: `case-studies` → `Case Studies`.
 */
export function folderDisplayName(slug) {
  return String(slug)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
