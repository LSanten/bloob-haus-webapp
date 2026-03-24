/**
 * services parser — pure function
 *
 * Input:  raw markdown content of a ::: services container
 * Output: { heading: string, description: string, items: string[] }
 *
 * Expected format:
 *
 *   ## Our Services
 *
 *   Short description paragraph about the services.
 *
 *   - Service item one
 *   - Service item two
 *   - Service item three
 *
 * The first # / ## / ### line becomes the heading.
 * Non-heading, non-list lines before the first list item become the description.
 * Lines starting with "- " become the service items.
 */

/**
 * @param {string} raw  Raw markdown content of the ::: services block
 * @returns {{ heading: string, description: string, items: string[] }}
 */
export function parse(raw) {
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l);

  let heading = "";
  const descLines = [];
  const items = [];
  let inList = false;

  for (const line of lines) {
    if (!heading && /^#{1,3}\s+/.test(line)) {
      heading = line.replace(/^#{1,3}\s+/, "").trim();
    } else if (line.startsWith("- ")) {
      inList = true;
      items.push(line.slice(2).trim());
    } else if (!inList && !line.startsWith("#")) {
      descLines.push(line);
    }
  }

  return { heading, description: descLines.join(" "), items };
}
