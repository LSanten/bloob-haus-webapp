/**
 * Smart Title Case
 *
 * Turns a slug-style or filename-style name into a human-readable display title:
 * separators become spaces, words are capitalised, and short joining words stay
 * lowercase unless they lead.
 *
 * Two rules matter and are easy to break:
 *
 * 1. **Only the first letter of a word is touched.** The rest is left exactly as
 *    authored, so acronyms survive ("come-to-MELT" → "Come to MELT"). Never
 *    lowercase the tail of a word to "normalise" it.
 * 2. **Feed this the ORIGINAL name, never the URL slug.** A site with
 *    `case: lower` has already destroyed the casing by the time a slug exists —
 *    "MELT" is unrecoverable from "melt". Call this on the filename or folder
 *    name as it appears in the vault.
 *
 * This is the single implementation for display-name prettification. It replaced
 * three divergent copies (file-index-builder's prettifyFolderName, the two
 * folderDisplay blocks in preprocess-content.js) plus the `titleCase` Nunjucks
 * filter, which disagreed about small words.
 */

/**
 * Joining words that stay lowercase when they are not the first word.
 * Kept in sync with what the `titleCase` Nunjucks filter has always used.
 */
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "so",
  "the",
  "to",
  "up",
]);

/**
 * Converts a slug/filename/folder name into a display title.
 *
 * @param {string} str - Original name (e.g. "come-to-MELT", "music we melt to")
 * @returns {string} Display title (e.g. "Come to MELT", "Music We Melt to")
 */
export function smartTitleCase(str) {
  if (str === null || str === undefined || str === "") return "";

  return String(str)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word, i) => {
      if (!word) return word;
      if (i > 0 && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      // Only the leading character changes — the tail keeps its authored casing
      // so acronyms ("MELT") and interior capitals ("McKenzie") survive.
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
