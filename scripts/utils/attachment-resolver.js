/**
 * Attachment Resolver
 * Resolves image and file references, copies attachments to static folder.
 */

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";

/**
 * Resolves image and attachment references in markdown content.
 * Handles: ![alt](image.jpg), ![](image.jpg), ![[image.jpg]] (wiki-style)
 *
 * @param {string} content - Markdown content with image references
 * @param {Object} attachmentIndex - Attachment index from buildAttachmentIndex()
 * @returns {Object} { content, resolved, broken } - processed content and stats
 */
export function resolveAttachments(content, attachmentIndex) {
  const resolved = [];
  const broken = [];

  // Pattern 1: Standard markdown images ![alt](path)
  const mdImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

  let processedContent = content.replace(
    mdImagePattern,
    (match, alt, imagePath) => {
      // Decode URL-encoded characters
      const decodedPath = decodeURIComponent(imagePath);
      const filename = path.basename(decodedPath);

      // Look up in attachment index
      const resolvedPath =
        attachmentIndex[filename] || attachmentIndex[filename.toLowerCase()];

      if (resolvedPath) {
        resolved.push({ original: imagePath, resolved: resolvedPath });
        return `![${alt}](${resolvedPath})`;
      } else {
        broken.push({ original: imagePath });
        return match; // Keep original if not found
      }
    },
  );

  // Pattern 2: Wiki-style images ![[image.jpg]]
  const wikiImagePattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  processedContent = processedContent.replace(
    wikiImagePattern,
    (match, imagePath, altText) => {
      const decodedPath = decodeURIComponent(imagePath);
      const filename = path.basename(decodedPath);
      const alt = altText || "";

      // Look up in attachment index
      const resolvedPath =
        attachmentIndex[filename] || attachmentIndex[filename.toLowerCase()];

      if (resolvedPath) {
        resolved.push({ original: imagePath, resolved: resolvedPath });
        return `![${alt}](${resolvedPath})`;
      } else {
        broken.push({ original: imagePath });
        return `![${alt}](${imagePath})`; // Convert to standard markdown anyway
      }
    },
  );

  return { content: processedContent, resolved, broken };
}

/**
 * Copies attachments from content source to static output folder.
 * @param {string} contentDir - Path to content directory
 * @param {string} attachmentFolder - Relative path to attachment folder in content
 * @param {string} outputDir - Path to output static folder (e.g., static/media)
 * @returns {Object} { copied, errors } - stats about copied files
 */
export async function copyAttachments(contentDir, attachmentFolder, outputDir) {
  const sourceDir = path.join(contentDir, attachmentFolder);

  if (!await fs.pathExists(sourceDir)) {
    console.log(`[attachments] No attachment folder found at: ${sourceDir}`);
    return { copied: [], errors: [] };
  }

  // Ensure output directory exists
  await fs.ensureDir(outputDir);

  // Find all attachment files
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
  const files = await glob(pattern, { cwd: sourceDir, nodir: true });

  console.log(`[attachments] Found ${files.length} attachments to copy`);

  const copied = [];
  const errors = [];

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(outputDir, path.basename(file));

    try {
      await fs.copy(sourcePath, destPath);
      copied.push(file);
    } catch (error) {
      errors.push({ file, error: error.message });
      console.error(`[attachments] Error copying ${file}: ${error.message}`);
    }
  }

  console.log(`[attachments] Copied ${copied.length} files to ${outputDir}`);

  return { copied, errors };
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testContent = `
# Recipe

Here's a photo:

![](Pasted%20image%2020250315160236.jpg)

And a wiki-style image:

![[cleanshot_2026-01-10-at-22-20-23@2x.png]]

And one that doesn't exist:

![](nonexistent.jpg)
`;

  const mockAttachmentIndex = {
    "Pasted image 20250315160236.jpg": "/media/Pasted image 20250315160236.jpg",
    "pasted image 20250315160236.jpg": "/media/Pasted image 20250315160236.jpg",
    "cleanshot_2026-01-10-at-22-20-23@2x.png":
      "/media/cleanshot_2026-01-10-at-22-20-23@2x.png",
  };

  const result = resolveAttachments(testContent, mockAttachmentIndex);
  console.log("Processed content:");
  console.log(result.content);
  console.log("\nResolved:", result.resolved);
  console.log("Broken:", result.broken);
}
