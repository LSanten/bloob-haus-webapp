/**
 * Attachment Resolver
 * Resolves image and file references, copies attachments to static folder.
 */

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import sharp from "sharp";

/**
 * Resolves image and attachment references in markdown content.
 *
 * Handles three syntaxes:
 *   1. Standard markdown  ![alt](path)
 *   2. Wiki-style         ![[image.jpg]]
 *   3. Raw HTML src=      <img>, <video>, <audio>, <source>, <embed>, <iframe>
 *
 * Resolution strategy:
 *   - Wiki syntax (![[]])  → basename lookup only (Obsidian never includes a path)
 *   - Markdown / HTML src  → path-aware first (resolves ../relative/paths against the
 *                            source file's vault location), then basename fallback
 *
 * @param {string} content - Markdown content
 * @param {{ byBasename: Object, byVaultPath: Object }} attachmentIndex
 * @param {{ sourceVaultPath?: string }} [options]
 *   sourceVaultPath: vault-relative path of the file being processed
 *                    (e.g. "marbles/my-page.md") — enables path-aware resolution
 * @returns {{ content: string, resolved: Array, broken: Array }}
 */
export function resolveAttachments(content, attachmentIndex, { sourceVaultPath = null } = {}) {
  const { byBasename, byVaultPath } = attachmentIndex;
  const resolved = [];
  const broken = [];

  // Resolve a vault-relative path from a relative src like "../projects/file.jpg".
  // Returns the URL if found in byVaultPath, null otherwise.
  function resolveVaultRelative(rawSrc) {
    if (!sourceVaultPath) return null;
    const decoded = decodeURIComponent(rawSrc);
    // Compute source file's directory within the vault (forward slashes)
    const sourceDir = sourceVaultPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
    const joined = sourceDir ? sourceDir + "/" + decoded : decoded;
    // Manually normalize: handle .. and . segments
    const parts = joined.split("/");
    const normalized = [];
    for (const part of parts) {
      if (part === "..") normalized.pop();
      else if (part !== ".") normalized.push(part);
    }
    const vaultRelPath = normalized.join("/");
    return byVaultPath[vaultRelPath] || byVaultPath[vaultRelPath.toLowerCase()] || null;
  }

  // Basename fallback: extract filename from path and look up in byBasename.
  function lookupBasename(rawSrc) {
    const decoded = decodeURIComponent(rawSrc);
    const filename = path.basename(decoded);
    return byBasename[filename] || byBasename[filename.toLowerCase()] || null;
  }

  // Full resolution: path-aware first, basename fallback.
  function resolve(rawSrc) {
    return resolveVaultRelative(rawSrc) || lookupBasename(rawSrc);
  }

  // Pattern 1: Standard markdown images ![alt](path)
  const mdImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let processedContent = content.replace(mdImagePattern, (match, alt, imagePath) => {
    // .md links are page transclusions — handled by transclusion-handler.js before this runs
    if (imagePath.toLowerCase().endsWith(".md")) return match;
    const resolvedPath = resolve(imagePath);
    if (resolvedPath) {
      resolved.push({ original: imagePath, resolved: resolvedPath });
      return `![${alt}](${resolvedPath})`;
    }
    broken.push({ original: imagePath });
    return match;
  });

  // Pattern 2: Wiki-style images ![[image.jpg]]
  // Wiki syntax never carries path info — always basename lookup only.
  const wikiImagePattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  processedContent = processedContent.replace(wikiImagePattern, (match, imagePath, altText) => {
    const decoded = decodeURIComponent(imagePath);
    const filename = path.basename(decoded);
    const alt = altText || "";
    const resolvedPath = byBasename[filename] || byBasename[filename.toLowerCase()] || null;
    if (resolvedPath) {
      resolved.push({ original: imagePath, resolved: resolvedPath });
      return `![${alt}](${resolvedPath})`;
    }
    broken.push({ original: imagePath });
    return `![${alt}](${imagePath})`;
  });

  // Pattern 3: Raw HTML src= on media/embed tags.
  // Covers: <img>, <video>, <audio>, <source>, <embed>, <iframe>
  // Path-aware: resolves Obsidian-relative paths (../folder/file) against the source
  // file's vault location so they become correct root-relative URLs on the web.
  const htmlSrcPattern =
    /<(img|video|audio|source|embed|iframe)\b([^>]*?)src=(["'])([^"']+)\3([^>]*?)>/gi;
  processedContent = processedContent.replace(
    htmlSrcPattern,
    (match, tag, before, quote, srcPath, after) => {
      // Leave root-relative and absolute URLs alone
      if (
        srcPath.startsWith("/") ||
        srcPath.startsWith("http://") ||
        srcPath.startsWith("https://") ||
        srcPath.startsWith("data:")
      ) {
        return match;
      }
      const resolvedPath = resolve(srcPath);
      if (resolvedPath) {
        resolved.push({ original: srcPath, resolved: resolvedPath });
        let resolvedTag = `<${tag}${before}src="${resolvedPath}"${after}>`;
        // <img> tags with relative paths are user-authored HTML — add no-optimize so
        // the image optimizer preserves inline attributes (style, width, class, etc.)
        // rather than wrapping in PhotoSwipe markup.
        if (tag.toLowerCase() === "img" && !resolvedTag.includes("no-optimize")) {
          const classMatch = resolvedTag.match(/\bclass=(["'])([^"']*)\1/);
          if (classMatch) {
            resolvedTag = resolvedTag.replace(
              classMatch[0],
              `class="${classMatch[2]} no-optimize"`,
            );
          } else {
            resolvedTag = resolvedTag.replace(/>$/, ' class="no-optimize">');
          }
        }
        return resolvedTag;
      }
      broken.push({ original: srcPath });
      return match;
    },
  );

  return { content: processedContent, resolved, broken };
}

/**
 * Extracts the first image reference from processed markdown content.
 * Call after resolveAttachments() so paths are already root-relative.
 * Matches any root-relative path to a known image extension.
 * @param {string} content - Processed markdown content
 * @returns {string|null} - Root-relative image path, or null
 */
export function extractFirstImage(content) {
  const match = content.match(
    /!\[[^\]]*\]\((\/[^)]+\.(?:jpg|jpeg|png|gif|webp|svg))\)/i,
  );
  return match ? match[1] : null;
}

/**
 * Copies attachments from the vault to the static root, preserving vault
 * directory structure so URLs match the vault layout.
 *
 * vault/media/logo.png        → staticRootDir/media/logo.png   → /media/logo.png
 * vault/projects/diagram.html → staticRootDir/projects/diagram.html → /projects/diagram.html
 *
 * @param {string} contentDir - Path to content directory (vault root)
 * @param {string} attachmentFolder - Obsidian attachmentFolderPath (retained for API compat)
 * @param {string} staticRootDir - Root of the static output tree (e.g., src/)
 * @returns {{ copied: string[], errors: Array }} vault-relative paths of copied files
 */
export async function copyAttachments(contentDir, attachmentFolder, staticRootDir) {
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
  const files = await glob(pattern, {
    cwd: contentDir,
    nodir: true,
    ignore: [".obsidian/**", "node_modules/**", ".git/**"],
  });

  console.log(`[attachments] Found ${files.length} attachments to copy`);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB — auto-compress threshold
  const HARD_LIMIT   = 25 * 1024 * 1024; // 25 MiB — Cloudflare Pages hard limit
  const COMPRESSIBLE = new Set(["jpg", "jpeg", "png"]);

  const copied = [];
  const skipped = [];
  const errors = [];

  for (const file of files) {
    const sourcePath = path.join(contentDir, file);
    const stat = await fs.stat(sourcePath);
    const destPath = path.join(staticRootDir, file);
    await fs.ensureDir(path.dirname(destPath));
    const ext = path.extname(file).replace(".", "").toLowerCase();

    if (stat.size > MAX_FILE_SIZE && COMPRESSIBLE.has(ext)) {
      const sizeMiB = (stat.size / 1024 / 1024).toFixed(1);
      console.warn(`[attachments] ⚠️  Large file (${sizeMiB} MiB), auto-compressing: ${file}`);
      try {
        await sharp(sourcePath)
          .resize({ width: 4000, withoutEnlargement: true })
          .toFile(destPath);
        const destStat = await fs.stat(destPath);
        const destMiB = (destStat.size / 1024 / 1024).toFixed(1);
        console.warn(`[attachments]    Compressed to ${destMiB} MiB`);
        copied.push(file);
      } catch (error) {
        errors.push({ file, error: error.message });
        console.error(`[attachments] Error compressing ${file}: ${error.message}`);
      }
      continue;
    }

    if (stat.size > HARD_LIMIT) {
      const sizeMiB = (stat.size / 1024 / 1024).toFixed(1);
      console.warn(`[attachments] ⚠️  SKIPPED (${sizeMiB} MiB > 25 MiB, not compressible): ${file}`);
      skipped.push({ file, sizeMiB });
      continue;
    }

    try {
      await fs.copy(sourcePath, destPath);
      copied.push(file);
    } catch (error) {
      errors.push({ file, error: error.message });
      console.error(`[attachments] Error copying ${file}: ${error.message}`);
    }
  }

  if (skipped.length > 0) {
    console.warn(`[attachments] ⚠️  ${skipped.length} file(s) skipped — exceed 25 MiB and cannot be auto-compressed.`);
  }
  console.log(`[attachments] Copied ${copied.length} files preserving vault structure`);

  return { copied, skipped, errors };
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
    byBasename: {
      "Pasted image 20250315160236.jpg": "/media/Pasted%20image%2020250315160236.jpg",
      "pasted image 20250315160236.jpg": "/media/Pasted%20image%2020250315160236.jpg",
      "cleanshot_2026-01-10-at-22-20-23@2x.png": "/media/cleanshot_2026-01-10-at-22-20-23%402x.png",
    },
    byVaultPath: {
      "media/Pasted image 20250315160236.jpg": "/media/Pasted%20image%2020250315160236.jpg",
      "media/cleanshot_2026-01-10-at-22-20-23@2x.png": "/media/cleanshot_2026-01-10-at-22-20-23%402x.png",
    },
  };

  const result = resolveAttachments(testContent, mockAttachmentIndex);
  console.log("Processed content:");
  console.log(result.content);
  console.log("\nResolved:", result.resolved);
  console.log("Broken:", result.broken);
}
