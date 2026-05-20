/**
 * File Index Builder
 * Builds lookup maps for pages and attachments to enable link resolution.
 */

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { getSlugFunction } from "./slug-strategy.js";

/**
 * Extracts the title from a markdown file.
 * Priority: 1) frontmatter title, 2) first # or ## heading, 3) filename
 * @param {Object} frontmatter - Parsed frontmatter
 * @param {string} content - Markdown content
 * @param {string} filename - Filename without extension
 * @returns {string} The extracted title
 */
function extractTitle(frontmatter, content, filename) {
  // 1. Explicit frontmatter title
  if (frontmatter.title) {
    return frontmatter.title;
  }

  // 2. First heading (# or ##) in content
  const headingMatch = content.match(/^#{1,2}\s+(.+)$/m);
  if (headingMatch) {
    let title = headingMatch[1];
    // Strip heading ID syntax like {#anchor-id}
    title = title.replace(/\s*\{#[^}]+\}\s*$/, "");
    // Strip inline markdown (bold, italic, code, links) — titles are plain text
    // used in <title> tags, graph.json, nav, tooltips, etc. Raw ** would render as literals.
    title = title
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    return title.trim();
  }

  // 3. Filename as fallback
  return filename;
}

/**
 * Converts a folder name (slug-style) to a human-readable title.
 * E.g. "my-folder" → "My Folder", "resources" → "Resources"
 */
function prettifyFolderName(name) {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generates a URL-safe slug from a title.
 * Default implementation — used as fallback when no strategy is specified.
 * @param {string} title - The title to slugify
 * @returns {string} URL-safe slug
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Builds an index of all publishable markdown files.
 * @param {Array} publishedFiles - Array of file objects from publish filter
 * @param {string} contentDir - Path to content directory
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.slugStrategy] - Slug strategy name ("slugify" or "preserve-case")
 * @returns {Object} Index with pages and lookup maps
 */
export async function buildFileIndex(publishedFiles, contentDir, options = {}) {
  const slugFn = options.slugStrategy ? getSlugFunction(options.slugStrategy) : slugify;
  console.log(`[index] Building index for ${publishedFiles.length} files`);

  const pages = {}; // slug → page info
  const titleLookup = {}; // title (lowercase) → slug
  const filenameLookup = {}; // filename (without ext, lowercase) → slug

  for (const file of publishedFiles) {
    const content = await fs.readFile(file.path, "utf-8");
    const { data: frontmatter, content: body } = matter(content);

    const filename = path.basename(file.relativePath, ".md");

    // Get folder path (e.g., "recipes" from "recipes/Challah.md")
    const folderPath = path.dirname(file.relativePath);
    const hasFolder = folderPath && folderPath !== ".";

    // For index files, fall back to prettified folder name rather than "index"
    const isIndex = filename === "index";
    const titleFallback =
      isIndex && hasFolder ? prettifyFolderName(path.basename(folderPath)) : filename;
    const title = extractTitle(frontmatter, body, titleFallback);

    // Slug is based on FILENAME, not title (URLs stay stable even if title changes)
    const slug = slugFn(filename);

    // Build URL with folder prefix if in a subfolder
    // Apply slug strategy to each folder segment
    const slugifiedFolder = hasFolder
      ? folderPath.split(path.sep).map(slugFn).join("/")
      : "";
    // index.md files use the folder URL (e.g. resources/index.md → /resources/)
    // matching the Eleventy permalink injected by preprocess-content.js
    const url = isIndex
      ? (hasFolder ? `/${slugifiedFolder}/` : "/")
      : (hasFolder ? `/${slugifiedFolder}/${slug}/` : `/${slug}/`);

    // Create a unique key that includes folder path to avoid collisions
    const fullSlug = hasFolder ? `${slugifiedFolder}/${slug}` : slug;

    const pageInfo = {
      title,
      slug,
      fullSlug,
      folder: hasFolder ? folderPath : null,
      path: file.path,
      relativePath: file.relativePath,
      url,
      frontmatter,
      rawBody: body,
    };

    pages[fullSlug] = pageInfo;
    titleLookup[title.toLowerCase()] = fullSlug;
    filenameLookup[filename.toLowerCase()] = fullSlug;

    // Also add filename without special characters for fuzzy matching
    const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedFilename !== filename.toLowerCase()) {
      filenameLookup[normalizedFilename] = fullSlug;
    }
  }

  console.log(`[index] Indexed ${Object.keys(pages).length} pages`);

  return {
    pages,
    titleLookup,
    filenameLookup,
  };
}

/**
 * Builds an index of all attachments (images, PDFs, HTML files, etc).
 *
 * Returns two maps:
 *   byBasename  — filename only → URL  (for wiki-link ![[file.jpg]] resolution)
 *   byVaultPath — vault-relative path → URL  (for path-aware <img src="../x/y.jpg"> resolution)
 *
 * Vault directory structure is preserved in URLs: vault/projects/chart.html → /projects/chart.html
 * On basename collision, the file inside the configured attachment folder wins
 * (mirrors Obsidian's own resolution preference).
 *
 * @param {string} contentDir - Path to content directory
 * @param {string} attachmentFolder - Obsidian attachmentFolderPath setting
 * @returns {{ byBasename: Object, byVaultPath: Object }}
 */
export async function buildAttachmentIndex(contentDir, attachmentFolder) {
  const extensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "pdf",
    "html",
    "mp4",
    "webm",
  ];
  const pattern = `**/*.{${extensions.join(",")}}`;

  // Scan the entire vault — mirrors Obsidian's resolution behaviour.
  const files = await glob(pattern, {
    cwd: contentDir,
    nodir: true,
    nocase: true,
    ignore: [".obsidian/**", "node_modules/**", ".git/**"],
  });

  // Normalize the configured attachment folder to a vault-root prefix.
  // "." or "" means "same folder as the note" — no global preference possible.
  let preferredPrefix = null;
  if (attachmentFolder && attachmentFolder !== "." && attachmentFolder !== "") {
    const normalized = attachmentFolder
      .replace(/^\.\//, "")
      .replace(/^\//, "")
      .replace(/\/$/, "");
    if (normalized) preferredPrefix = normalized + "/";
  }

  // Process non-preferred files first so preferred-folder files overwrite on collision.
  const orderedFiles = preferredPrefix
    ? [
        ...files.filter((f) => !f.startsWith(preferredPrefix)),
        ...files.filter((f) => f.startsWith(preferredPrefix)),
      ]
    : files;

  const byBasename = {};
  const byVaultPath = {};

  for (const file of orderedFiles) {
    // file is vault-relative with forward slashes (glob guarantees this)
    // e.g. "media/logo.png" or "projects/My Diagram.html"
    const filename = path.basename(file);
    const decodedFilename = decodeURIComponent(filename);

    // Preserve vault structure in URL: encode each segment individually
    const url = "/" + file.split("/").map(encodeURIComponent).join("/");

    // byVaultPath: exact vault-relative path → URL
    byVaultPath[file] = url;
    byVaultPath[file.toLowerCase()] = url;

    // byBasename: filename only → URL (for wiki-link resolution)
    if (byBasename[filename] !== undefined && byBasename[filename] !== url) {
      console.warn(
        `[index] Basename collision: "${filename}" found at multiple vault paths. ` +
        `Using: ${url}`,
      );
    }
    byBasename[filename] = url;
    byBasename[decodedFilename] = url;
    byBasename[filename.toLowerCase()] = url;
    byBasename[decodedFilename.toLowerCase()] = url;
  }

  console.log(`[index] Indexed ${files.length} attachments from vault`);

  return { byBasename, byVaultPath };
}

/**
 * Resolves a link target to a URL using the index.
 * @param {string} target - The link target (title, filename, or path)
 * @param {Object} index - The file index
 * @returns {Object} { url, found } - resolved URL and whether it was found
 */
export function resolveLink(target, index) {
  const normalized = target.toLowerCase().replace(/\.md$/, "");

  // Try title lookup
  if (index.titleLookup[normalized]) {
    const slug = index.titleLookup[normalized];
    return { url: index.pages[slug].url, fullSlug: slug, found: true };
  }

  // Try filename lookup
  if (index.filenameLookup[normalized]) {
    const slug = index.filenameLookup[normalized];
    return { url: index.pages[slug].url, fullSlug: slug, found: true };
  }

  // Try normalized (no special chars) filename lookup
  const normalizedNoSpecial = normalized.replace(/[^a-z0-9]/g, "");
  if (index.filenameLookup[normalizedNoSpecial]) {
    const slug = index.filenameLookup[normalizedNoSpecial];
    return { url: index.pages[slug].url, fullSlug: slug, found: true };
  }

  return { url: null, fullSlug: null, found: false };
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const contentDir = process.argv[2] || "./content-source";

  // Simple test - scan all md files directly
  (async () => {
    const pattern = contentDir.replace(/\\/g, "/") + "/**/*.md";
    const files = await glob(pattern, { nodir: true });

    const publishedFiles = files
      .filter((f) => !f.includes(".obsidian"))
      .map((f) => ({
        path: f,
        relativePath: path.relative(contentDir, f),
      }));

    const index = await buildFileIndex(publishedFiles, contentDir);

    console.log("\n[index] Sample pages:");
    const slugs = Object.keys(index.pages).slice(0, 5);
    for (const slug of slugs) {
      const page = index.pages[slug];
      console.log(`  "${page.title}" → ${page.url}`);
    }

    // Test attachment index
    const { byBasename, byVaultPath } = await buildAttachmentIndex(contentDir, "media");
    console.log("\n[index] Sample attachments (byBasename):");
    for (const key of Object.keys(byBasename).slice(0, 5)) {
      console.log(`  "${key}" → ${byBasename[key]}`);
    }
    console.log("\n[index] Sample attachments (byVaultPath):");
    for (const key of Object.keys(byVaultPath).slice(0, 5)) {
      console.log(`  "${key}" → ${byVaultPath[key]}`);
    }
  })();
}
