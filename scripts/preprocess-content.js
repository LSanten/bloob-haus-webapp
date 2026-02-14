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
  extractFirstImage,
} from "./utils/attachment-resolver.js";
import { handleTransclusions } from "./utils/transclusion-handler.js";
import { stripComments } from "./utils/comment-stripper.js";
import { getLastModifiedDate } from "./utils/git-date-extractor.js";
import { extractTags, buildTagIndex } from "./utils/tag-extractor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// Output directories per target
const OUTPUT_DIRS = {
  hugo: {
    content: path.join(ROOT_DIR, "hugo", "content"),
    static: path.join(ROOT_DIR, "hugo", "static"),
  },
  eleventy: {
    content: path.join(ROOT_DIR, "src"),
    static: path.join(ROOT_DIR, "src"),
  },
};

/**
 * Get the current build target (read at call time, not import time)
 */
function getBuildTarget() {
  return process.env.BUILD_TARGET || "eleventy";
}

/**
 * Main preprocessing function.
 * @param {Object} options - Configuration options
 * @param {string} options.contentDir - Path to cloned content directory
 * @param {string} options.outputDir - Path to content output directory
 * @param {string} options.staticDir - Path to static assets directory
 * @returns {Object} Processing stats
 */
export async function preprocessContent({
  contentDir = path.join(ROOT_DIR, "content-source"),
  outputDir,
  staticDir,
} = {}) {
  const BUILD_TARGET = getBuildTarget();
  outputDir = outputDir || OUTPUT_DIRS[BUILD_TARGET].content;
  staticDir = staticDir || OUTPUT_DIRS[BUILD_TARGET].static;
  console.log("\n========================================");
  console.log(`  PREPROCESSING CONTENT (target: ${BUILD_TARGET})`);
  console.log("========================================\n");

  const stats = {
    filesProcessed: 0,
    filesExcluded: 0,
    linksResolved: 0,
    linksBroken: 0,
    attachmentsCopied: 0,
    transclusions: 0,
    tagsExtracted: 0,
    gitDatesFound: 0,
    gitDatesMissing: 0,
  };

  // Collect page data for tag index (built after file loop)
  const allPageData = [];

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

    // 6f: Extract and normalize tags from frontmatter + inline content
    const pageTags = extractTags(frontmatter, processedContent);
    if (pageTags.length > 0) {
      stats.tagsExtracted += pageTags.length;
    }

    // Build output frontmatter
    const pageInfo =
      fileIndex.pages[
        Object.keys(fileIndex.pages).find(
          (key) => fileIndex.pages[key].relativePath === file.relativePath,
        )
      ];

    // Get last modified date from git history
    const gitDate = getLastModifiedDate(file.path, contentDir);

    const pageTitle =
      pageInfo?.title ||
      frontmatter.title ||
      path.basename(file.relativePath, ".md");

    const outputFrontmatter = {
      ...frontmatter,
      title: pageTitle,
      slug: pageInfo?.slug,
      tags: pageTags,
    };

    // Collect page data for tag index
    if (pageTags.length > 0 && pageInfo) {
      allPageData.push({
        title: pageTitle,
        url: pageInfo.url,
        tags: pageTags,
        excerpt: frontmatter.description || "",
      });
    }

    // Add date if we got it from git and it's not already set
    if (gitDate && !frontmatter.date) {
      outputFrontmatter.date = gitDate;
      stats.gitDatesFound++;
    } else if (!gitDate && !frontmatter.date) {
      stats.gitDatesMissing++;
    }

    // Extract first image for OG preview
    const firstImage = extractFirstImage(processedContent);
    if (firstImage) {
      const imgFilename = path.basename(decodeURIComponent(firstImage));
      const imgExt = path.extname(imgFilename).toLowerCase();
      const imgBase = imgFilename.replace(/\.[^.]+$/, "");
      const ogExt =
        imgExt === ".gif" ? "gif" : imgExt === ".png" ? "png" : "jpeg";
      outputFrontmatter.image = `/og/${encodeURIComponent(imgBase)}-og.${ogExt}`;
    }

    // Add layout for Eleventy
    if (BUILD_TARGET === "eleventy") {
      outputFrontmatter.layout = "layouts/page.njk";
    }

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

  // Step 7: Build global tag index
  console.log("\n--- Step 7: Building tag index ---");
  const tagIndex = buildTagIndex(allPageData);
  const tagIndexDir = path.join(outputDir, "_data");
  await fs.ensureDir(tagIndexDir);
  const tagIndexPath = path.join(tagIndexDir, "tagIndex.json");
  await fs.writeJson(tagIndexPath, tagIndex, { spaces: 2 });
  console.log(
    `[tags] Wrote ${Object.keys(tagIndex).length} tags to tagIndex.json (${stats.tagsExtracted} total tag references)`,
  );

  // Step 8: Copy attachments
  console.log("\n--- Step 8: Copying attachments ---");
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
  console.log(`  Tags extracted:  ${stats.tagsExtracted}`);
  console.log(`  Unique tags:     ${Object.keys(tagIndex).length}`);
  console.log(`  Attachments:     ${stats.attachmentsCopied}`);
  console.log(`  Git dates found: ${stats.gitDatesFound}`);
  console.log(`  Git dates missing: ${stats.gitDatesMissing}`);
  if (stats.gitDatesMissing > 0) {
    console.log(
      `  ⚠ ${stats.gitDatesMissing} files have no git date — recipe ordering may be wrong.`,
    );
    console.log(
      `    Make sure content repo is cloned with full history (not --depth 1).`,
    );
  }
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
