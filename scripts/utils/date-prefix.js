/**
 * Jekyll-style date-prefix handling for filenames.
 *
 * A leading `YYYY-MM-DD-` on a note filename (e.g. "2026-06-24-my-post") is
 * treated as the note's date plus a separator. When a site opts in via
 * `features.date_prefix_slugs`, the pipeline:
 *   1. strips the prefix from the URL slug ("my-post", not "2026-06-24-my-post")
 *   2. uses the date as `date_created` when frontmatter omits one
 *
 * Opt-in only — backwards compatible with sites that intentionally keep dates
 * in their URLs. See docs/architecture/settings-registry.md.
 *
 * NOTE: Eleventy itself natively strips a leading YYYY-MM-DD- from fileSlug /
 * filePathStem and uses it as the page date, so by default the date is dropped
 * from the URL regardless. preprocess-content.js pins an explicit permalink for
 * date-prefixed files to make that a real, two-way setting.
 */

// Strict month (01-12) and day (01-31) ranges so we don't mistake an arbitrary
// "1234-56-78-foo" for a date. Requires a non-empty remainder after the prefix.
const DATE_PREFIX_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(.+)$/;

/**
 * Splits a date-prefixed filename (no extension) into its date and remainder.
 * @param {string} filename - filename without extension, e.g. "2026-06-24-my-post"
 * @returns {{ date: string|null, name: string }} date as YYYY-MM-DD (or null) and
 *          the filename with the prefix removed (unchanged when no prefix matched).
 */
export function stripDatePrefix(filename) {
  const m = String(filename).match(DATE_PREFIX_RE);
  if (!m) return { date: null, name: filename };
  const [, y, mo, d, rest] = m;
  return { date: `${y}-${mo}-${d}`, name: rest };
}
