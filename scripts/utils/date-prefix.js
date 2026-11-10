/**
 * Jekyll-style date-prefix handling for filenames.
 *
 * A leading `YYYY-MM-DD-` or `YYYY-MM-DD ` on a note filename (e.g.
 * "2026-06-24-my-post" or "2026-06-24 My Post") is treated as the note's date
 * plus a separator. The pipeline:
 *   1. always uses the date as `date_created` when frontmatter omits one
 *   2. keeps or strips the prefix in the URL per `url.date_prefix`
 *      (see resolveDatePrefixMode below)
 *   3. redirects the other form of the URL to the real one (`url.date_redirect`,
 *      on by default — see date-redirects.js)
 * See docs/architecture/settings-registry.md.
 *
 * NOTE: Eleventy itself natively strips a leading YYYY-MM-DD- from fileSlug /
 * filePathStem and uses it as the page date, so left alone the date is dropped
 * from the URL regardless. preprocess-content.js pins an explicit permalink for
 * every date-prefixed file so the setting really decides.
 */

// Strict month (01-12) and day (01-31) ranges so we don't mistake an arbitrary
// "1234-56-78-foo" for a date. Requires a non-empty remainder after the prefix.
// The separator after the date may be a hyphen ("2026-06-24-my-post", Jekyll) or
// spaces ("2026-06-24 My Post", Obsidian). Both slugify to the same
// "2026-06-24-..." file that Eleventy natively date-strips, so both must be
// recognised here or `date_prefix: keep` silently loses the date.
const DATE_PREFIX_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:-| +)(\S.*)$/;

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

/**
 * The one URL decision for date-prefixed filenames: does the date stay in the URL?
 *
 *   keep  — "2026-06-24-my-post" stays in the URL
 *   strip — the URL is "my-post" (the default: it is what Eleventy does natively)
 *
 * The filename date fills a missing `date_created` in BOTH modes — that part is
 * universal Bloob Haus behavior, not a setting.
 *
 * Reads the feature flags bloob-settings-reader.js maps `url.date_prefix` onto:
 *   keep        → date_from_filename: true,  date_prefix_slugs: false
 *   strip/none  → date_prefix_slugs: true
 * A legacy `sites/*.yaml` with only `date_from_filename: true` meant "date stays
 * in the URL", so it still reads as keep.
 *
 * @param {Object} [features] - siteConfig.features
 * @returns {"keep"|"strip"}
 */
export function resolveDatePrefixMode(features) {
  const f = features || {};
  if (f.date_prefix_slugs === true) return "strip";
  if (f.date_from_filename === true) return "keep";
  return "strip";
}
