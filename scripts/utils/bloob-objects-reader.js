/**
 * Bloob Objects Reader
 *
 * Reads `_bloob-objects.md` from the content repo root and parses the
 * object-type registry table into a JSON object.
 *
 * The registry maps bloob-object types (marble, note, letter, pouch, …)
 * to their identity image, banner text, and description.
 *
 * _bloob-objects.md table format:
 *
 *   | object_type | display_name | image | banner_text | description |
 *   |-------------|--------------|-------|-------------|-------------|
 *   | marble      | Marble       | /assets/objects/marble.png | Here is a marble for you. | A marble is … |
 *
 * Output shape (bloobObjects.json):
 *
 *   {
 *     "marble": {
 *       "display_name": "Marble",
 *       "image": "/assets/objects/marble.png",
 *       "banner_text": "Here is a marble for you.",
 *       "description": "A marble is a note I want to share and shape with you."
 *     },
 *     …
 *   }
 */

import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

const OBJECTS_FILENAME = "_bloob-objects.md";

/**
 * Parses a Markdown table into an array of row objects.
 * Assumes the first row is the header row.
 *
 * @param {string} tableText - Raw markdown table string
 * @returns {Array<Object>} Array of row objects keyed by header name
 */
function parseMarkdownTable(tableText) {
  const lines = tableText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 3) return []; // need header + separator + at least one row

  // Parse headers from first line
  const headers = lines[0]
    .split("|")
    .slice(1, -1) // remove leading and trailing empty strings
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  // lines[1] is the separator row (---|---|...) — skip it
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    if (cells.length !== headers.length) continue; // malformed row, skip

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Reads and parses `_bloob-objects.md` from the content repo root.
 *
 * @param {string} contentDir - Absolute path to the content repo root
 * @returns {Object} Registry keyed by object_type. Empty object if file is missing.
 */
export async function readBloobObjects(contentDir) {
  const objectsFilePath = path.join(contentDir, OBJECTS_FILENAME);

  // Graceful: if the file doesn't exist, return empty registry (no crash)
  if (!(await fs.pathExists(objectsFilePath))) {
    console.log(
      `[bloob-objects] No ${OBJECTS_FILENAME} found in content repo — using empty object registry`,
    );
    return {};
  }

  const raw = await fs.readFile(objectsFilePath, "utf-8");
  const { content } = matter(raw); // strip frontmatter, just parse the body

  const rows = parseMarkdownTable(content);

  if (rows.length === 0) {
    console.warn(
      `[bloob-objects] ${OBJECTS_FILENAME} found but no valid table rows parsed`,
    );
    return {};
  }

  // Build registry keyed by object_type (lowercase, trimmed)
  const registry = {};
  for (const row of rows) {
    const type = row.object_type?.toLowerCase().trim();
    if (!type) continue;

    registry[type] = {
      display_name: row.display_name || type,
      image: row.image || "",
      banner_text: row.banner_text || "",
      description: row.description || "",
      // Optional layout column — gracefully absent if column not in table
      layout: row.layout || "",
    };
  }

  console.log(
    `[bloob-objects] Loaded ${Object.keys(registry).length} object types: ${Object.keys(registry).join(", ")}`,
  );

  return registry;
}

/**
 * Parses the raw `image` field from a _bloob-objects.md row into a relative
 * filesystem path (no leading slash). Returns null if no valid image.
 *
 * Handles:
 *   "none" / "default" / ""       → null (no icon)
 *   "![](media/file.png)"          → "media/file.png"  (URL-decoded)
 *   "[[filename.png]]"             → "media/filename.png"
 *   "/assets/objects/marble.png"   → "assets/objects/marble.png"
 *
 * @param {string|undefined} imageField - Raw image cell value from the table
 * @returns {string|null} Relative filesystem path or null
 */
export function parseObjectImageField(imageField) {
  if (!imageField || imageField === "none" || imageField === "default") return null;

  // Markdown image syntax: ![alt](path)
  const mdMatch = imageField.match(/^!\[.*?\]\((.+?)\)$/);
  if (mdMatch) return decodeURIComponent(mdMatch[1]);

  // Wiki-link syntax: [[filename.png]]
  const wikiMatch = imageField.match(/^\[\[(.+?)\]\]$/);
  if (wikiMatch) return `media/${wikiMatch[1]}`;

  // Plain URL path — strip leading slash for filesystem use
  return imageField.replace(/^\//, "");
}

/**
 * Normalizes a raw `bloob-object` frontmatter value.
 * Strips leading `#` (in case someone writes `bloob-object: #marble`),
 * lowercases, and trims.
 *
 * @param {string|undefined} value - Raw frontmatter value
 * @returns {string|null} Normalized type string, or null if not set
 */
export function normalizeBloobObject(value) {
  if (!value || typeof value !== "string") return null;
  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}
