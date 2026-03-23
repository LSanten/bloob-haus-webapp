/**
 * testimonials parser — pure function
 *
 * Input:  raw markdown content of a ::: testimonials container (string)
 * Output: array of { quote, name, role } objects
 *
 * Expected format — one blockquote per testimonial:
 *
 *   > Alter Engineers have been a pleasure to work with...
 *   >
 *   > ~ name: JaQuan Cornish
 *   > ~ role: PM at Oakland Unified School District
 *
 * Multiple testimonials are separated by blank lines (no > prefix).
 * Metadata lines start with `~ key: value` inside the blockquote.
 * All other non-empty blockquote lines are joined as the quote text.
 *
 * Pure — no DOM, no file system, no side effects. Runs identically in:
 *   - Eleventy build (reads data-vis-raw, calls this parser)
 *   - Browser live preview (same parser, different renderer call)
 *   - Obsidian plugin (reads ::: block directly, same parser)
 */

/**
 * Parse a single blockquote block (array of inner lines, > stripped).
 */
function parseBlock(lines) {
  const quoteLines = [];
  const meta = {};

  for (const line of lines) {
    const metaMatch = line.match(/^~\s+(\w+)\s*:\s*(.+)$/);
    if (metaMatch) {
      meta[metaMatch[1]] = metaMatch[2].trim();
    } else if (line.trim() !== "") {
      quoteLines.push(line.trim());
    }
  }

  return {
    quote: quoteLines.join(" "),
    name: meta.name || "",
    role: meta.role || "",
  };
}

/**
 * @param {string} raw  Raw markdown content of the ::: testimonials block
 * @returns {{ quote: string, name: string, role: string }[]}
 */
export function parse(raw) {
  const lines = raw.split("\n");
  const testimonials = [];

  let inBlock = false;
  let blockLines = [];

  for (const line of lines) {
    const isQuoteLine = /^>/.test(line.trim());

    if (isQuoteLine) {
      inBlock = true;
      // Strip leading > and optional single space
      blockLines.push(line.replace(/^>\s?/, ""));
    } else {
      // Non-> line (blank separator between blockquotes)
      if (inBlock && blockLines.length > 0) {
        testimonials.push(parseBlock(blockLines));
        blockLines = [];
        inBlock = false;
      }
    }
  }

  // Handle last block (no trailing blank line)
  if (blockLines.length > 0) {
    testimonials.push(parseBlock(blockLines));
  }

  return testimonials.filter((t) => t.quote);
}
