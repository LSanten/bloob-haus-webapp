/**
 * File Index Builder
 * Builds lookup maps for pages and attachments to enable link resolution.
 */

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";

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
    // Strip heading ID syntax like {#anchor-id}
    return headingMatch[1].replace(/\s*\{#[^}]+\}\s*$/, "").trim();
  }

  // 3. Filename as fallback
  return filename;
}

/**
 * Generates a URL-safe slug from a title.
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
 * @returns {Object} Index with pages and lookup maps
 */
export async function buildFileIndex(publishedFiles, contentDir) {
  console.log(`[index] Building index for ${publishedFiles.length} files`);

  const pages = {}; // slug → page info
  const titleLookup = {}; // title (lowercase) → slug
  const filenameLookup = {}; // filename (without ext, lowercase) → slug

  for (const file of publishedFiles) {
    const content = await fs.readFile(file.path, "utf-8");
    const { data: frontmatter, content: body } = matter(content);

    const filename = path.basename(file.relativePath, ".md");
    const title = extractTitle(frontmatter, body, filename);

    // Slug is based on FILENAME, not title (URLs stay stable even if title changes)
    const slug = slugify(filename);

    // Get folder path (e.g., "recipes" from "recipes/Challah.md")
    const folderPath = path.dirname(file.relativePath);
    const hasFolder = folderPath && folderPath !== ".";

    // Build URL with folder prefix if in a subfolder
    const url = hasFolder ? `/${folderPath}/${slug}/` : `/${slug}/`;

    // Create a unique key that includes folder path to avoid collisions
    const fullSlug = hasFolder ? `${folderPath}/${slug}` : slug;

    const pageInfo = {
      title,
      slug,
      fullSlug,
      folder: hasFolder ? folderPath : null,
      path: file.path,
      relativePath: file.relativePath,
      url,
      frontmatter,
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
 * Builds an index of all attachments (images, PDFs, etc).
 * @param {string} contentDir - Path to content directory
 * @param {string} attachmentFolder - Relative path to attachment folder
 * @returns {Object} Attachment index mapping filenames to output paths
 */
export async function buildAttachmentIndex(contentDir, attachmentFolder) {
  const attachmentDir = path.join(contentDir, attachmentFolder);

  if (!(await fs.pathExists(attachmentDir))) {
    console.log(`[index] No attachment folder found at: ${attachmentFolder}`);
    return {};
  }

  const extensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "pdf",
    "html",
  ];
  const pattern = `**/*.{${extensions.join(",")}}`;

  const files = await glob(pattern, { cwd: attachmentDir, nodir: true });

  const attachments = {};

  for (const file of files) {
    const filename = path.basename(file);
    // Decode URL-encoded filenames (e.g., "Pasted%20image" → "Pasted image")
    const decodedFilename = decodeURIComponent(filename);

    attachments[filename] = `/media/${filename}`;
    attachments[decodedFilename] = `/media/${filename}`;

    // Also store lowercase versions for case-insensitive matching
    attachments[filename.toLowerCase()] = `/media/${filename}`;
    attachments[decodedFilename.toLowerCase()] = `/media/${filename}`;
  }

  console.log(`[index] Indexed ${files.length} attachments`);

  return attachments;
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
    return { url: index.pages[slug].url, found: true };
  }

  // Try filename lookup
  if (index.filenameLookup[normalized]) {
    const slug = index.filenameLookup[normalized];
    return { url: index.pages[slug].url, found: true };
  }

  // Try normalized (no special chars) filename lookup
  const normalizedNoSpecial = normalized.replace(/[^a-z0-9]/g, "");
  if (index.filenameLookup[normalizedNoSpecial]) {
    const slug = index.filenameLookup[normalizedNoSpecial];
    return { url: index.pages[slug].url, found: true };
  }

  return { url: null, found: false };
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const contentDir = process.argv[2] || "./content-source";

  // Simple test - scan all md files directly
  (async () => {
    const pattern = path.join(contentDir, "**/*.md");
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
    const attachments = await buildAttachmentIndex(contentDir, "media");
    console.log("\n[index] Sample attachments:");
    const attachmentKeys = Object.keys(attachments).slice(0, 5);
    for (const key of attachmentKeys) {
      console.log(`  "${key}" → ${attachments[key]}`);
    }
  })();
}
