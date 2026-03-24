/**
 * heading-and-paragraph parser — pure function
 *
 * Input:  raw markdown content of a ::: heading-and-paragraph container
 * Output: { heading: string, paragraph: string }
 *
 * Expected format:
 *
 *   ## Section Title
 *
 *   Body paragraph text. Can span multiple lines — they are joined with spaces.
 *
 * The first # / ## / ### line becomes the heading.
 * All other non-empty, non-heading lines become the paragraph.
 */

/**
 * @param {string} raw  Raw markdown content of the ::: heading-and-paragraph block
 * @returns {{ heading: string, paragraph: string }}
 */
export function parse(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l);

  let heading = "";
  const paragraphLines = [];

  for (const line of lines) {
    if (!heading && /^#{1,3}\s+/.test(line)) {
      heading = line.replace(/^#{1,3}\s+/, "").trim();
    } else if (!line.startsWith("#")) {
      paragraphLines.push(line);
    }
  }

  return { heading, paragraph: paragraphLines.join(" ") };
}
