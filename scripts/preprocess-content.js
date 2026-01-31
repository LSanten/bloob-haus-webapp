/**
 * Preprocess Content
 * Orchestrates all preprocessing steps: filter, index, resolve links, copy attachments.
 */

import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

import { readObsidianConfig } from "./utils/config-reader.js";
import {
  filterPublishableFiles,
  removeExcludedFiles,
} from "./utils/publish-filter.js";
import {
  buildFileIndex,
  buildAttachmentIndex,
} from "./utils/file-index-builder.js";
import { resolveWikiLinks } from "./utils/wiki-link-resolver.js";
import { resolveMarkdownLinks } from "./utils/markdown-link-resolver.js";
import {
  resolveAttachments,
  copyAttachments,
} from "./utils/attachment-resolver.js";
import { handleTransclusions } from "./utils/transclusion-handler.js";
import { stripComments } from "./utils/comment-stripper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Main preprocessing function.
 * @param {Object} options - Configuration options
 * @param {string} options.contentDir - Path to cloned content directory
 * @param {string} options.outputDir - Path to Hugo content directory
 * @param {string} options.staticDir - Path to Hugo static directory
 * @returns {Object} Processing stats
 */
export async function preprocessContent({
  contentDir = path.join(ROOT_DIR, "content-source"),
  outputDir = path.join(ROOT_DIR, "hugo", "content"),
  staticDir = path.join(ROOT_DIR, "hugo", "static"),
} = {}) {
  console.log("\n========================================");
  console.log("  PREPROCESSING CONTENT");
  console.log("========================================\n");

  const stats = {
    filesProcessed: 0,
    filesExcluded: 0,
    linksResolved: 0,
    linksBroken: 0,
    attachmentsCopied: 0,
    transclusions: 0,
  };

  // Step 1: Read Obsidian config
  console.log("--- Step 1: Reading Obsidian config ---");
  const obsidianConfig = await readObsidianConfig(contentDir);

  // Step 2: Filter publishable files
  console.log("\n--- Step 2: Filtering publishable files ---");
  const { published, excluded } = await filterPublishableFiles(contentDir);
  stats.filesExcluded = excluded.length;

  // Step 3: Build file index
  console.log("\n--- Step 3: Building file index ---");
  const fileIndex = await buildFileIndex(published, contentDir);

  // Step 4: Build attachment index
  console.log("\n--- Step 4: Building attachment index ---");
  const attachmentIndex = await buildAttachmentIndex(
    contentDir,
    obsidianConfig.attachmentFolderPath,
  );

  // Step 5: Ensure output directories exist
  console.log("\n--- Step 5: Preparing output directories ---");
  await fs.ensureDir(outputDir);
  await fs.ensureDir(path.join(staticDir, "media"));
  console.log(`[prep] Output directory: ${outputDir}`);
  console.log(`[prep] Static directory: ${staticDir}`);

  // Step 6: Process each file
  console.log("\n--- Step 6: Processing markdown files ---");

  for (const file of published) {
    console.log(`\n[process] ${file.relativePath}`);

    // Read file content
    const rawContent = await fs.readFile(file.path, "utf-8");
    const { data: frontmatter, content: body } = matter(rawContent);

    // Process content through each resolver
    let processedContent = body;

    // 6a: Strip comments (Obsidian %% ... %% and HTML <!-- ... -->)
    processedContent = stripComments(processedContent);

    // 6b: Handle transclusions first (before other ![[]] patterns)
    const transclusionResult = handleTransclusions(processedContent);
    processedContent = transclusionResult.content;
    stats.transclusions += transclusionResult.transclusions.length;

    // 6c: Resolve attachments (images)
    const attachmentResult = resolveAttachments(
      processedContent,
      attachmentIndex,
    );
    processedContent = attachmentResult.content;
    stats.linksResolved += attachmentResult.resolved.length;
    stats.linksBroken += attachmentResult.broken.length;

    // 6d: Resolve wiki-links
    const wikiLinkResult = resolveWikiLinks(processedContent, fileIndex);
    processedContent = wikiLinkResult.content;
    stats.linksResolved += wikiLinkResult.resolved.length;
    stats.linksBroken += wikiLinkResult.broken.length;

    // 6e: Resolve markdown links
    const mdLinkResult = resolveMarkdownLinks(processedContent, fileIndex);
    processedContent = mdLinkResult.content;
    stats.linksResolved += mdLinkResult.resolved.length;
    stats.linksBroken += mdLinkResult.broken.length;

    // Build output frontmatter
    const pageInfo =
      fileIndex.pages[
        Object.keys(fileIndex.pages).find(
          (key) => fileIndex.pages[key].relativePath === file.relativePath,
        )
      ];

    const outputFrontmatter = {
      ...frontmatter,
      title:
        pageInfo?.title ||
        frontmatter.title ||
        path.basename(file.relativePath, ".md"),
      slug: pageInfo?.slug,
    };

    // Reconstruct the file with frontmatter
    const outputContent = matter.stringify(processedContent, outputFrontmatter);

    // Determine output path (preserve folder structure)
    const outputPath = path.join(outputDir, file.relativePath);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, outputContent);

    stats.filesProcessed++;
    console.log(
      `[process]   → Written to: ${path.relative(ROOT_DIR, outputPath)}`,
    );
  }

  // Step 7: Copy attachments
  console.log("\n--- Step 7: Copying attachments ---");
  const mediaOutputDir = path.join(staticDir, "media");
  const { copied } = await copyAttachments(
    contentDir,
    obsidianConfig.attachmentFolderPath,
    mediaOutputDir,
  );
  stats.attachmentsCopied = copied.length;

  // Summary
  console.log("\n========================================");
  console.log("  PREPROCESSING COMPLETE");
  console.log("========================================");
  console.log(`  Files processed: ${stats.filesProcessed}`);
  console.log(`  Files excluded:  ${stats.filesExcluded}`);
  console.log(`  Links resolved:  ${stats.linksResolved}`);
  console.log(`  Links broken:    ${stats.linksBroken}`);
  console.log(`  Transclusions:   ${stats.transclusions}`);
  console.log(`  Attachments:     ${stats.attachmentsCopied}`);
  console.log("========================================\n");

  return stats;
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Load environment variables from .env.local
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }

  preprocessContent()
    .then((stats) => {
      console.log("Preprocessing completed successfully!");
    })
    .catch((error) => {
      console.error("Preprocessing failed:", error.message);
      process.exit(1);
    });
}
