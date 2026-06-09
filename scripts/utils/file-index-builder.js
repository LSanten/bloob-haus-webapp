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
 * Strips inline markdown from a heading string.
 * Used to normalise titles for plain-text contexts (SEO tags, graph, nav).
 */
function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/**
 * Extracts the plain-text title from a markdown file.
 * Priority: 1) frontmatter title (stripped), 2) first # or ## heading (stripped), 3) filename
 */
function extractTitle(frontmatter, content, filename) {
  // 1. Explicit frontmatter title — strip inline markdown so plain title is
  //    safe for <title> tags, graph.json, nav, tooltips, etc.
  if (frontmatter.title) {
    return stripInlineMarkdown(
      String(frontmatter.title).replace(/\s*\{#[^}]+\}\s*$/, "")
    ).trim();
  }

  // 2. First heading (# or ##) in content
  const headingMatch = content.match(/^#{1,2}\s+(.+)$/m);
  if (headingMatch) {
    const raw = headingMatch[1].replace(/\s*\{#[^}]+\}\s*$/, "");
    return stripInlineMarkdown(raw).trim();
  }

  // 3. Filename as fallback
  return filename;
}

/**
 * Extracts the raw (markdown-preserved) title from a markdown file.
 * Returns null when the title has no inline formatting (caller can skip title_md).
 */
function extractTitleMd(frontmatter, content, filename) {
  let raw;
  if (frontmatter.title) {
    raw = String(frontmatter.title).replace(/\s*\{#[^}]+\}\s*$/, "").trim();
  } else {
    const headingMatch = content.match(/^#{1,2}\s+(.+)$/m);
    if (headingMatch) {
      raw = headingMatch[1].replace(/\s*\{#[^}]+\}\s*$/, "").trim();
    } else {
      return null;
    }
  }
  // Only return a value when it actually differs from the stripped version
  const plain = stripInlineMarkdown(raw).trim();
  return raw !== plain ? raw : null;
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

    // For index files, fall back to prettified folder name rather than "index" or "_index"
    const isIndex = filename === "index" || filename === "_index";
    const titleFallback =
      isIndex && hasFolder ? prettifyFolderName(path.basename(folderPath)) : filename;
    const title = extractTitle(frontmatter, body, titleFallback);
    const titleMd = extractTitleMd(frontmatter, body, titleFallback);

    // Build URL with folder prefix if in a subfolder
    // Apply slug strategy to each folder segment
    const slugifiedFolder = hasFolder
      ? folderPath.split(path.sep).map(slugFn).join("/")
      : "";

    // Slug is based on filename, not title (URLs stay stable even if title changes).
    // Exception: folder index files use the parent folder name as the slug so that
    // "resources/index.md" is indexed as "resources", not "index".
    const slug = (isIndex && hasFolder)
      ? slugFn(path.basename(folderPath))
      : slugFn(filename);

    // index.md files use the folder URL (e.g. resources/index.md → /resources/)
    // matching the Eleventy permalink injected by preprocess-content.js
    const url = isIndex
      ? (hasFolder ? `/${slugifiedFolder}/` : "/")
      : (hasFolder ? `/${slugifiedFolder}/${slug}/` : `/${slug}/`);

    // Create a unique key that includes folder path to avoid collisions.
    // Folder index files use just the folder path (not folder/folder after the slug fix).
    const fullSlug = isIndex
      ? (hasFolder ? slugifiedFolder : "")
      : (hasFolder ? `${slugifiedFolder}/${slug}` : slug);

    const pageInfo = {
      title,
      ...(titleMd ? { title_md: titleMd } : {}),
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
    // For folder index files also register "folder/index" so resolveLink("resources/index.md")
    // still works after fullSlug changed from "resources/index" to "resources".
    if (isIndex && hasFolder) {
      filenameLookup[`${slugifiedFolder}/index`] = fullSlug;
    }

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

  // Normalize all paths to forward slashes before sorting/filtering
  const normalizedFiles = files.map((f) => f.replace(/\\/g, "/"));

  // Process non-preferred files first so preferred-folder files overwrite on collision.
  const orderedFiles = preferredPrefix
    ? [
        ...normalizedFiles.filter((f) => !f.startsWith(preferredPrefix)),
        ...normalizedFiles.filter((f) => f.startsWith(preferredPrefix)),
      ]
    : normalizedFiles;

  const byBasename = {};
  const byVaultPath = {};

  for (const rawFile of orderedFiles) {
    // Normalize to forward slashes — glob should guarantee this but Windows can return backslashes
    const file = rawFile.replace(/\\/g, "/");
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
