/**
 * image-grid parser — pure function
 *
 * Input:  raw markdown content of a ::: image-grid container (string)
 * Output: array of { src, alt, name, role } objects
 *
 * Expected format — a markdown pipe table with three columns:
 *
 *   | Photo               | Name            | Title                    |
 *   | ------------------- | --------------- | ------------------------ |
 *   | ![[865A2882.jpg]]   | Shannon Allison | Principal, Mech. Design  |
 *
 * Image cell formats handled:
 *   ![[filename.jpg]]         — Obsidian wikilink (in vault, before resolution)
 *   ![alt](/media/file.jpg)   — resolved markdown image (after preprocessor)
 *
 * This function is pure and has no side effects. It can run identically in:
 *   - Eleventy build (reads data-vis-raw, calls this parser)
 *   - Browser live preview (same parser, different renderer call)
 *   - Obsidian plugin (reads ::: block directly, same parser)
 */

function isTableSeparator(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseCells(line) {
  // Split on | and strip the empty first/last segments
  return line
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1);
}

function extractImageInfo(cell) {
  // Resolved markdown image: ![alt](/media/file.jpg)
  const mdImgMatch = cell.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdImgMatch) return { src: mdImgMatch[2], alt: mdImgMatch[1] };

  // Obsidian wikilink image: ![[filename.jpg]]
  const wikiMatch = cell.match(/!\[\[([^\]]+)\]\]/);
  if (wikiMatch) return { src: wikiMatch[1], alt: wikiMatch[1] };

  return { src: "", alt: "" };
}

/**
 * @param {string} raw  Raw markdown content of the ::: image-grid block
 * @returns {{ src: string, alt: string, name: string, role: string }[]}
 */
export function parse(raw) {
  const tableLines = raw
    .split("\n")
    .filter((line) => line.trim().startsWith("|"));

  const dataLines = tableLines.filter((line) => !isTableSeparator(line));

  // Skip header row (first data line)
  const rows = dataLines.slice(1);

  return rows
    .map((line) => {
      const cells = parseCells(line);
      const [photoCell = "", nameCell = "", titleCell = ""] = cells;
      const { src, alt } = extractImageInfo(photoCell);
      return { src, alt, name: nameCell, role: titleCell };
    })
    .filter((m) => m.name || m.src);
}
