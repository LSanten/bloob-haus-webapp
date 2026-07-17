/**
 * parser.js — the garden shape's own fence parser.
 *
 * Parses the `::: garden` block per schema.md ("Parsing" section). This file is
 * deliberately dependency-free and environment-agnostic (no DOM, no Node APIs
 * except an optional Buffer/atob fallback) so the SAME parser runs in:
 *   - the build-time renderer (index.js, inside the site build)
 *   - the builder GUI (round-trip read, Task 4)
 *
 * Garden parses its own block — it does NOT go through the shared
 * `:::settings` YAML path. Only fence-boundary discovery is conceptually
 * shared with other shapes (see webapp shapes.md → "Shape-named blocks").
 */

/** Default sizes per element type — the renderer's fallback when `size:` is omitted. */
export const DEFAULT_SIZES = {
  "seed": [130, 130],
  "sapling": [135, 165],
  "mature-tree": [175, 186],
  "flower": [105, 185],
  "compost": [150, 123],
  "water-bucket": [120, 150],
  "waffle-planter": [155, 125],
  "bee": [100, 85],
  "custom": [100, 100],
};

export const KNOWN_TYPES = Object.keys(DEFAULT_SIZES);

/**
 * Find the `::: garden` fence in a markdown body.
 *
 * Tolerates extra attributes on the opener line (the site preprocessor injects
 * `_raw="base64"` onto container openers — when present, the decoded value is
 * used as the authoritative inner content). Closer detection tolerates
 * trailing whitespace and is depth-aware for nested ::: blocks.
 *
 * @param {string} markdown
 * @returns {{ inner: string } | null}
 */
export function findGardenFence(markdown) {
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (!/^:::\s*garden(\s|$)/.test(trimmed)) continue;

    // Preprocessor-injected raw content wins when present.
    const rawMatch = trimmed.match(/_raw="([A-Za-z0-9+/=]*)"/);
    if (rawMatch) {
      return { inner: decodeBase64(rawMatch[1]) };
    }

    // Manual scan to the matching closer.
    let depth = 1;
    for (let j = i + 1; j < lines.length; j++) {
      const inner = lines[j].trimStart();
      if (/^:::/.test(inner)) {
        // Trailing whitespace on a closer must not read as a nested opener.
        if (inner.trimEnd() === ":::") {
          depth--;
          if (depth === 0) {
            return { inner: lines.slice(i + 1, j).join("\n") };
          }
        } else {
          depth++;
        }
      }
    }
    // Unclosed fence: take everything to the end.
    return { inner: lines.slice(i + 1).join("\n") };
  }
  return null;
}

/**
 * Parse the inner content of a `::: garden` fence into the garden model.
 *
 * Top-level bullet items are settings (`- key: value`, no `@`) or elements
 * (`- <type> "<title>" @<x>,<y> [attrs]`). Child bullets under an element are
 * its page, as markdown prose (one bullet per paragraph). Indentation depth is
 * whatever is deeper than the parent — tabs and spaces both count, and NO tab
 * width is assumed (this is what keeps the format robust to Obsidian's
 * tab/space setting). Unknown top-level lines are ignored.
 *
 * @param {string} inner
 * @returns {{
 *   settings: { title?: string, author?: string, canvas: {width:number,height:number},
 *               sky: string, ground?: string, painting?: string },
 *   elements: Array<{ id:string, type:string, title:string, x:number, y:number,
 *                     width:number, height:number, fontSize?:number, src?:string,
 *                     page: string[] }>
 * }}
 */
export function parseGarden(inner) {
  const settings = { canvas: { width: 1000, height: 600 }, sky: "#87CEEB" };
  const elements = [];
  const usedIds = new Map();

  const lines = inner.split("\n");
  let current = null; // the element whose children we're collecting

  for (const line of lines) {
    if (line.trim() === "") continue;

    const indent = line.match(/^[\t ]*/)[0];
    const content = line.slice(indent.length);
    const isTopLevel = indent.length === 0;

    if (isTopLevel && content.startsWith("- ")) {
      const item = content.slice(2).trim();
      const el = parseElementLine(item);
      if (el) {
        el.id = mintId(el.title, usedIds);
        elements.push(el);
        current = el;
        continue;
      }
      const setting = item.match(/^([\w-]+):\s*(.*)$/);
      if (setting) {
        applySetting(settings, setting[1], unquote(setting[2]));
        current = null;
        continue;
      }
      // Unknown top-level item — ignored (freeform-tolerant).
      current = null;
    } else if (!isTopLevel && current) {
      // Any deeper-indented bullet is a page paragraph of the current element.
      const child = content.replace(/^-\s+/, "").trim();
      if (child) current.page.push(child);
    }
    // Unknown non-bullet / orphan lines are ignored.
  }

  return { settings, elements };
}

/** `<type> "<title>" @<x>,<y> [size:…] [src:…]` — returns null if not an element line. */
function parseElementLine(item) {
  const m = item.match(/^([\w-]+)\s+"([^"]*)"\s+@(-?\d+)\s*,\s*(-?\d+)\s*(.*)$/);
  if (!m) return null;

  const [, type, title, x, y, rest] = m;
  const el = {
    type,
    title,
    x: parseInt(x, 10),
    y: parseInt(y, 10),
    page: [],
  };

  const sizeMatch = rest.match(/(?:^|\s)size:(\d+)(?:x(\d+))?/);
  const srcMatch = rest.match(/(?:^|\s)src:(\S+)/);
  if (srcMatch) el.src = srcMatch[1];

  if (type === "label") {
    // For a label, size:N is the font size (no x).
    el.fontSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 16;
  } else {
    const defaults = DEFAULT_SIZES[type] || DEFAULT_SIZES["custom"];
    if (sizeMatch && sizeMatch[2]) {
      el.width = parseInt(sizeMatch[1], 10);
      el.height = parseInt(sizeMatch[2], 10);
    } else {
      el.width = defaults[0];
      el.height = defaults[1];
    }
  }
  return el;
}

function applySetting(settings, key, value) {
  switch (key) {
    case "canvas": {
      const m = value.match(/^(\d+)\s*x\s*(\d+)$/);
      if (m) settings.canvas = { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
      break;
    }
    case "title": settings.title = value; break;
    case "author": settings.author = value; break;
    case "sky": settings.sky = value; break;
    case "ground": settings.ground = value; break;
    case "painting": settings.painting = value; break;
    default: break; // unknown settings are ignored
  }
}

/** Slugified title, numeric-suffixed for uniqueness — the stable element id. */
export function mintId(title, usedIds) {
  const base = slugify(title) || "element";
  const count = usedIds.get(base) || 0;
  usedIds.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

export function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function decodeBase64(b64) {
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf-8");
  // Browser fallback (builder round-trip never sees _raw, but be safe):
  return decodeURIComponent(escape(atob(b64)));
}
