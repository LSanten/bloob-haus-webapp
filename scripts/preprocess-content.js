/**
 * Preprocess Content
 * Orchestrates all preprocessing steps: filter, index, resolve links, copy attachments.
 */

import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath, pathToFileURL } from "url";
import { glob } from "glob";

import { readObsidianConfig } from "./utils/config-reader.js";
import {
  filterPublishableFiles,
  removeExcludedFiles,
} from "./utils/publish-filter.js";
import {
  loadSiteConfig,
  resolveSiteName,
} from "./utils/config-loader.js";
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
import { stripLeadingTitleHeading, stripInlineMarkdown } from "./utils/title-deduplicator.js";
import { injectContainerRaw } from "./utils/inject-container-raw.js";
import { extractSettingsBlock } from "./utils/extract-settings-block.js";
import { getLastModifiedDate } from "./utils/git-date-extractor.js";
import { extractTags, buildTagIndex } from "./utils/tag-extractor.js";
import { buildGraph } from "./utils/graph-builder.js";
import { resolveRedirect } from "./utils/redirect-resolver.js";
import {
  readBloobObjects,
  normalizeBloobObject,
  parseObjectImageField,
} from "./utils/bloob-objects-reader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// Output directories per target
const OUTPUT_DIRS = {
  hugo: {
    content: path.join(ROOT_DIR, "hugo", "content"),
    static: path.join(ROOT_DIR, "hugo", "static"),
  },
  eleventy: {
    get content() { return process.env.SRC_DIR || path.join(ROOT_DIR, "src"); },
    get static() { return process.env.SRC_DIR || path.join(ROOT_DIR, "src"); },
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
  pageFilter,   // optional: relative path or filename — build only this one file
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

  // Collect detailed broken link info for validation report
  const brokenLinkDetails = [];

  // Collect page data for tag index (built after file loop)
  const allPageData = [];

  // Collect per-page outgoing links for graph.json (built after file loop)
  const perPageLinks = {};

  // Step 1: Read Obsidian config
  console.log("--- Step 1: Reading Obsidian config ---");
  const obsidianConfig = await readObsidianConfig(contentDir);

  // Load site config to get publish settings from _bloob-settings.md
  // This ensures blocklist_tag and publish_mode are always read from the vault,
  // not from env vars that may not be set (e.g. during `npm run dev:*`).
  const siteName = resolveSiteName();
  const siteConfig = await loadSiteConfig(siteName, { contentDir });
  const publishOptions = {
    ...(siteConfig.content?.publish_mode && { publishMode: siteConfig.content.publish_mode }),
    ...(siteConfig.content?.blocklist_tag && { blocklistTag: siteConfig.content.blocklist_tag }),
    ...(siteConfig.content?.exclude_files && { excludeFiles: siteConfig.content.exclude_files }),
    ...(siteConfig.content?.status_field && { statusField: siteConfig.content.status_field }),
  };

  // Step 2: Filter publishable files
  console.log("\n--- Step 2: Filtering publishable files ---");
  let { published, excluded, config: filterConfig } = await filterPublishableFiles(contentDir, publishOptions);
  stats.filesExcluded = excluded.length;

  // Single-page mode: build only one file for fast dev/visualizer testing
  if (pageFilter) {
    const needle = pageFilter.replace(/\\/g, "/").replace(/^\//, "");
    const needleBase = path.basename(needle, ".md");
    const match = published.find((f) => {
      const rel = f.relativePath.replace(/\\/g, "/");
      const relBase = path.basename(rel, ".md");
      return rel === needle || rel.endsWith("/" + needle) || relBase === needleBase;
    });
    if (match) {
      console.log(`\n[page-filter] ⚡ Single-page mode: ${match.relativePath}`);
      console.log(`[page-filter]    Skipping ${published.length - 1} other file(s).`);
      published = [match];
    } else {
      console.warn(`\n[page-filter] ⚠ '${pageFilter}' not found in published files — building all.`);
      console.warn(`[page-filter]   (File may be a draft or excluded by publish rules.)`);
    }
  }

  // Step 3: Build file index
  console.log("\n--- Step 3: Building file index ---");
  const slugStrategy = process.env.SLUG_STRATEGY || "slugify";
  // In status_field mode, draft files are excluded from publishing but their URLs
  // are stable and should resolve when referenced via wiki-links (e.g. card-preview).
  // In blocklist/allowlist modes, excluded files are private and must not be indexed.
  const draftFiles = filterConfig.publishMode === "status_field"
    ? excluded.filter(f => f.isDraft)
    : [];
  const fileIndex = await buildFileIndex([...published, ...draftFiles], contentDir, { slugStrategy });

  // Step 4: Build attachment index
  console.log("\n--- Step 4: Building attachment index ---");
  const attachmentIndex = await buildAttachmentIndex(
    contentDir,
    obsidianConfig.attachmentFolderPath,
  );

  // Step 4.5: Read bloob-objects registry (once per build)
  console.log("\n--- Step 4.5: Reading bloob-objects registry ---");
  const bloobObjectsRegistry = await readBloobObjects(contentDir);

  // Step 5: Clean and prepare output directories
  console.log("\n--- Step 5: Preparing output directories ---");

  // Clean all content .md files from a previous build (different site may have left stale files)
  const existingMdFiles = await glob("**/*.md", { cwd: outputDir, absolute: true }).catch(() => []);
  for (const f of existingMdFiles) {
    await fs.remove(f);
  }

  // Clean attachment files from previous build to prevent stale files from a different
  // site appearing in this build's output. Vault structure is now preserved in staticDir,
  // so we glob for all attachment extensions rather than just removing staticDir/media/.
  // Skip: media/optimized/ (image optimizer cache — intentionally persisted across builds),
  //       og/ (OG image cache), assets/ (theme assets written by assemble-src),
  //       favicon.png / apple-touch-icon.png (generated by assemble step — not vault files).
  const ATTACHMENT_CLEAN_IGNORE = [
    "media/optimized/**",
    "og/**",
    "assets/**",
    "favicon.png",
    "apple-touch-icon.png",
    // Preserve converted MP4s produced by optimize-gifs.js — without this,
    // they're deleted here and re-converted on every dev restart (no cache hit).
    "**/*.mp4",
    "**/*.webm",
  ];
  const attachmentExts = "jpg,jpeg,png,gif,webp,svg,pdf,html,mp4,webm";
  const staleAttachments = await glob(`**/*.{${attachmentExts}}`, {
    cwd: staticDir,
    absolute: true,
    ignore: ATTACHMENT_CLEAN_IGNORE,
  }).catch(() => []);
  for (const f of staleAttachments) await fs.remove(f);

  await fs.ensureDir(outputDir);
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

    // 6b.pre: Normalize markdown-link-style transclusions → wiki-link style.
    // Obsidian's "Use markdown links" mode writes ![alt](page.md) for page embeds.
    // .md is unambiguous — no image has that extension — so rewrite before the
    // transclusion handler runs. Strip the extension; the handler does its own lookup.
    processedContent = processedContent.replace(
      /!\[([^\]]*)\]\(([^)]+\.md)\)/g,
      (_, _alt, src) => `![[${path.basename(src, ".md")}]]`
    );

    // 6b: Handle transclusions first (before other ![[]] patterns)
    const currentFilename = path.basename(file.relativePath, ".md");
    const currentSlug = fileIndex.filenameLookup[currentFilename.toLowerCase()] || null;
    // Site-wide default from features.transclusion_indicators; per-page frontmatter overrides.
    const siteTransclusionIndicators = siteConfig.features?.transclusion_indicators ?? true;
    const showTransclusionIndicators = frontmatter.transclusion_indicators ?? siteTransclusionIndicators;
    const transclusionResult = handleTransclusions(processedContent, fileIndex, {
      sourceFile: currentSlug,
      showIndicators: showTransclusionIndicators,
    });
    processedContent = transclusionResult.content;
    stats.transclusions += transclusionResult.transclusions.length;

    // 6c: Resolve attachments (images, embeds, HTML files)
    const attachmentResult = resolveAttachments(
      processedContent,
      attachmentIndex,
      { sourceVaultPath: file.relativePath.replace(/\\/g, "/") },
    );
    processedContent = attachmentResult.content;
    stats.linksResolved += attachmentResult.resolved.length;
    stats.linksBroken += attachmentResult.broken.length;
    for (const b of attachmentResult.broken) {
      brokenLinkDetails.push({ source: file.relativePath, type: "attachment", target: b.original });
    }

    // 6d: Resolve wiki-links → plain markdown links (pills applied client-side by internal-links.js)
    const wikiLinkResult = resolveWikiLinks(processedContent, fileIndex);
    processedContent = wikiLinkResult.content;
    stats.linksResolved += wikiLinkResult.resolved.length;
    stats.linksBroken += wikiLinkResult.broken.length;
    for (const b of wikiLinkResult.broken) {
      brokenLinkDetails.push({ source: file.relativePath, type: "wiki-link", target: b.target });
    }

    // 6e: Resolve markdown links
    const mdLinkResult = resolveMarkdownLinks(processedContent, fileIndex);
    processedContent = mdLinkResult.content;
    stats.linksResolved += mdLinkResult.resolved.length;
    stats.linksBroken += mdLinkResult.broken.length;
    for (const b of mdLinkResult.broken) {
      brokenLinkDetails.push({ source: file.relativePath, type: "markdown-link", target: b.target });
    }

    // 6e.3: For file-scope shapes (bloob-shape: in frontmatter), extract the
    // ::: settings block before injectContainerRaw runs. The block is removed
    // from the body so it doesn't render as raw markdown or get _raw= injected.
    const bloobShape = frontmatter["bloob-shape"];
    let shapeSettings = {};
    if (bloobShape) {
      const extracted = extractSettingsBlock(processedContent);
      shapeSettings = extracted.settings;
      processedContent = extracted.body;
    }

    // 6e.5: Inject data-vis-raw into ::: container blocks
    // Must run AFTER all link resolution (attachments, wiki-links, markdown-links)
    // so the raw content captured reflects resolved paths.
    // Must run BEFORE markdown-it (i.e. before Eleventy processes src/) so
    // markdownItContainer can emit it as a data-vis-raw HTML attribute.
    // This is what enables visualizer parser.js to be shared across Eleventy,
    // browser live preview, and future Obsidian plugin.
    processedContent = injectContainerRaw(processedContent);

    // 6e.6: File-scope shape rendering.
    // Two roles for bloob-shape:
    //   a) Body renderer — shape has renderFilescope(settings, body) in its index.js.
    //      The returned HTML replaces the markdown body entirely.
    //   b) Layout shape — shape has no renderFilescope (or no index.js at all).
    //      Treated as a layout reference: layouts/[name].njk wraps the page as chrome.
    //      Enables the convention bloob-shape: article → layouts/article.njk.
    let bloobShapeLayout = null;
    if (bloobShape) {
      const shapePath = path.join(ROOT_DIR, "lib/visualizers", bloobShape, "index.js");
      if (await fs.pathExists(shapePath)) {
        try {
          const mod = await import(pathToFileURL(shapePath).href);
          if (typeof mod.renderFilescope === "function") {
            console.log(`[shape] Rendering file-scope shape: ${bloobShape}`);
            processedContent = await mod.renderFilescope(shapeSettings, processedContent);
          } else {
            // Module exists but no renderFilescope — treat as layout shape
            bloobShapeLayout = `layouts/${bloobShape}.njk`;
            console.log(`[shape] "${bloobShape}" has no renderFilescope — using as layout: ${bloobShapeLayout}`);
          }
        } catch (e) {
          console.warn(`[shape] Failed to load ${bloobShape}: ${e.message}`);
        }
      } else {
        // No index.js — only treat as a layout shape if the visualizer folder exists.
        // An unknown name (e.g. bloob-shape: note with no lib/visualizers/note/) is
        // likely a content annotation, not a shape — fall back to page.njk silently.
        const shapeDirPath = path.join(ROOT_DIR, "lib/visualizers", bloobShape);
        if (await fs.pathExists(shapeDirPath)) {
          bloobShapeLayout = `layouts/${bloobShape}.njk`;
          console.log(`[shape] "${bloobShape}" is a layout shape → ${bloobShapeLayout}`);
        } else {
          console.warn(`[shape] bloob-shape: "${bloobShape}" not found in lib/visualizers/ — falling back to page.njk`);
        }
      }
    }

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

    // 6g: Collect outgoing links for graph data (wiki-links + markdown links).
    // unlisted pages are excluded entirely — they must not appear in graph.json
    // or any runtime visualizer. archived/public pages carry website_status for
    // visualizers that need to filter them from listings.
    if (pageInfo && frontmatter.website_status !== "unlisted") {
      const outgoing = [
        ...wikiLinkResult.resolved.map((r) => r.url),
        ...mdLinkResult.resolved.map((r) => r.url),
      ];
      const fileDir = path.dirname(file.relativePath).replace(/\\/g, "/");
      perPageLinks[pageInfo.url] = {
        title: pageTitle,
        filename: path.basename(file.relativePath, ".md"),
        folder: fileDir === "." ? null : fileDir,
        outgoing,
        ...(frontmatter.website_status && { website_status: frontmatter.website_status }),
        ...(frontmatter.type && { content_type: frontmatter.type }),
      };
    }

    // 6h: Normalize bloob-object/bloob-type (both accepted; bloob-type takes priority)
    const bloobObject = normalizeBloobObject(frontmatter["bloob-type"] || frontmatter["bloob-object"]);

    // Resolve redirect frontmatter (supports bare URLs, [[wiki-links]], [text](url)).
    // Accept both `redirect:` and `Redirect:` (YAML is case-sensitive; vault authors may use either).
    const resolvedRedirect = resolveRedirect(
      frontmatter.redirect || frontmatter.Redirect,
      fileIndex,
    );

    // Normalize visibility: unlisted, website_status: unlisted, or #unlisted tag
    // into a single internal flag that templates, layouts, and eleventyComputed read.
    const isUnlisted =
      frontmatter.visibility === "unlisted" ||
      frontmatter.website_status === "unlisted" ||
      pageTags.some((t) => t === "unlisted" || t === "#unlisted");

    const outputFrontmatter = {
      ...frontmatter,
      title: pageTitle,
      slug: pageInfo?.slug,
      ...(pageInfo?.slug && { slug_spaced: pageInfo.slug.replace(/-/g, " ") }),
      tags: pageTags,
      ...(bloobObject && { bloob_object: bloobObject }),
      ...(resolvedRedirect && { redirect: resolvedRedirect }),
      ...(isUnlisted && { _bloob_unlisted: true }),
    };

    // Propagate redirect to graph node
    if (resolvedRedirect && pageInfo && perPageLinks[pageInfo.url]) {
      perPageLinks[pageInfo.url].redirect = resolvedRedirect;
    }

    // Store bloob icon path on graph node for use in pills and the connections graph.
    // - Specific image → resized icon at /assets/objects/bloob-icons/[type]-icon.png
    // - "default"      → /favicon.png (site's own favicon as fallback)
    // - "none" / unset → no icon
    const objData = bloobObjectsRegistry[bloobObject];
    if (bloobObject && objData && pageInfo && perPageLinks[pageInfo.url]) {
      const hasSpecificImage = parseObjectImageField(objData.image);
      const isDefault = objData.image === "default";
      if (hasSpecificImage) {
        perPageLinks[pageInfo.url].bloobIcon = `/assets/objects/bloob-icons/${bloobObject}-icon.png`;
      } else if (isDefault) {
        perPageLinks[pageInfo.url].bloobIcon = "/favicon.png";
      }
    }

    // Propagate extra frontmatter fields to the graph node.
    // Sites configure which fields to include per bloob-object type in
    // sites/[site].yaml under graph.extra_fields.[type]: [field, ...].
    // The special key "tags" maps to the already-extracted pageTags array.
    if (bloobObject && pageInfo && perPageLinks[pageInfo.url]) {
      const extraFieldList = siteConfig?.graph?.extra_fields?.[bloobObject] || [];
      for (const field of extraFieldList) {
        if (field === "tags") {
          if (pageTags.length > 0) perPageLinks[pageInfo.url].tags = pageTags;
        } else if (frontmatter[field] !== undefined && frontmatter[field] !== null) {
          perPageLinks[pageInfo.url][field] = frontmatter[field];
        }
      }
    }

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
      // GIFs → first frame extracted as JPEG by generate-og-images.js
      const ogExt = imgExt === ".png" ? "png" : "jpeg";
      // encodeURIComponent the filename so URLs are valid (spaces → %20, @ → %40, etc.)
      // The OG generator writes files with the same encoding so names match on disk.
      outputFrontmatter.image = `/og/${encodeURIComponent(imgBase)}-og.${ogExt}`;
      // Also store image on the graph node for hover previews
      if (pageInfo && perPageLinks[pageInfo.url]) {
        perPageLinks[pageInfo.url].image = outputFrontmatter.image;
      }
    }

    // Add layout for Eleventy.
    // Priority order (highest → lowest):
    //   1. Explicit `layout: layouts/…` in the file's own frontmatter
    //   2. Layout declared on the bloob-type in _bloob-types.md / _bloob-objects.md
    //   3a. bloob-shape as layout shape (no renderFilescope) → layouts/[name].njk
    //   3b. defaultLayout from the shape's manifest.json (renderFilescope shapes)
    //   4. Default: layouts/page.njk (layouts/base.njk for index.md files)
    const hasEleventyLayout =
      frontmatter.layout && String(frontmatter.layout).startsWith("layouts/");

    // Resolve a layout from the bloob-object registry (optional `layout` column).
    // Value in the table should be just the filename, e.g. "project.njk" — we
    // prepend "layouts/" automatically. Empty / absent → no injection.
    const objLayout = objData?.layout?.trim();
    const bloobObjectLayout =
      objLayout ? `layouts/${objLayout.replace(/^layouts\//, "")}` : null;

    // Read defaultLayout from the shape's manifest.json when bloob-shape is declared.
    // Fills the gap for renderFilescope shapes (bloobShapeLayout is only set for
    // layout-only shapes without renderFilescope).
    let shapeManifestLayout = null;
    if (bloobShape && !bloobShapeLayout && BUILD_TARGET === "eleventy") {
      const manifestPath = path.join(ROOT_DIR, "lib/visualizers", bloobShape, "manifest.json");
      if (await fs.pathExists(manifestPath)) {
        try {
          const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
          shapeManifestLayout = manifest.defaultLayout || null;
        } catch (e) { /* ignore malformed manifest */ }
      }
    }

    if (BUILD_TARGET === "eleventy") {
      if (!hasEleventyLayout) {
        outputFrontmatter.layout = bloobObjectLayout ?? bloobShapeLayout ?? shapeManifestLayout ?? "layouts/page.njk";
      }
    }

    // Auto-inject Eleventy frontmatter for index.md files.
    // Users should write plain content — no YAML boilerplate needed.
    // Works for root index.md (permalink: /) and subfolder index.md (permalink: /folder/).
    const isIndexFile =
      path.basename(file.relativePath, ".md") === "index";
    if (isIndexFile && BUILD_TARGET === "eleventy") {
      const dir = path.dirname(file.relativePath);
      const permalink =
        dir === "." ? "/" : "/" + dir.replace(/\\/g, "/") + "/";
      outputFrontmatter.permalink = permalink;
      if (!hasEleventyLayout) {
        outputFrontmatter.layout = bloobObjectLayout ?? bloobShapeLayout ?? shapeManifestLayout ?? "layouts/base.njk";
      }
      // Auto-inject folder slug and display title from directory name when not set by user.
      if (dir !== ".") {
        const folderSlug = path.basename(dir).replace(/\\/g, "/");
        if (!frontmatter.folder) {
          outputFrontmatter.folder = folderSlug;
        }
        // Only inject title when no real title exists — pageTitle falls back to
        // the filename stem ("index") when neither frontmatter title nor an H1
        // heading provides one. If a user wrote "# My Title", pageTitle is already
        // "My Title" (set via file-index-builder) and we must not overwrite it.
        const filenameStem = path.basename(file.relativePath, ".md");
        if (pageTitle === filenameStem) {
          const folderDisplay = folderSlug
            .split(/[-_\s]+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          outputFrontmatter.title = folderDisplay;
          outputFrontmatter.folder_display = folderDisplay;
        }
      }
      // Exclude from tag and section listings but keep in collections.all
      // so embed-pages.njk can generate /folder/embed/ URLs for them.
      outputFrontmatter.eleventyExcludeFromCollections = ["tagList"];
      outputFrontmatter.templateEngineOverride = "njk,md";
      outputFrontmatter.is_folder = true;
    }

    // Strip leading H1 from content body if it duplicates the page title.
    // page.njk renders <h1>{{ title_md or title }}</h1> — if markdown also
    // starts with "# Same Title" that heading would double-render.
    // If an H2 follows the H1, it is extracted as a subtitle (raw markdown preserved).
    const { content: deduped, subtitle, titleMd, heroImages } = stripLeadingTitleHeading(processedContent, pageTitle);
    if (deduped !== processedContent) {
      processedContent = deduped;
      console.log(`[process]   Stripped leading H1 matching title: "${pageTitle}"`);

      // title_md: raw markdown for template H1 rendering.
      // Prefer the value from file-index (handles explicit frontmatter titles with markdown).
      const rawTitleMd = pageInfo?.title_md || titleMd || null;
      if (rawTitleMd) {
        outputFrontmatter.title_md = rawTitleMd;
        console.log(`[process]   Preserved title_md: "${rawTitleMd}"`);
      }

      if (subtitle) {
        outputFrontmatter.subtitle = subtitle;
        console.log(`[process]   Extracted subtitle: "${subtitle}"`);
        // Add plain subtitle to graph data
        if (pageInfo && perPageLinks[pageInfo.url]) {
          perPageLinks[pageInfo.url].subtitle = stripInlineMarkdown(subtitle).trim();
        }
      }
      if (heroImages && heroImages.length > 0) {
        outputFrontmatter.hero_images = heroImages;
        console.log(`[process]   Extracted hero images: ${heroImages.join(', ')}`);
      }
    }

    // Also handle title_md for pages where frontmatter.title contains markdown
    // but no H1 was stripped (e.g. user wrote title: _Italic_ in frontmatter directly).
    if (!outputFrontmatter.title_md && pageInfo?.title_md) {
      outputFrontmatter.title_md = pageInfo.title_md;
    }

    // Reconstruct the file with frontmatter
    const outputContent = matter.stringify(processedContent, outputFrontmatter);

    // Determine output path (preserve folder structure, sanitize spaces → hyphens)
    const sanitizedRelPath = file.relativePath.split(path.sep).map(seg => seg.replace(/ /g, '-')).join(path.sep);
    const outputPath = path.join(outputDir, sanitizedRelPath);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, outputContent);

    stats.filesProcessed++;
    console.log(
      `[process]   → Written to: ${path.relative(ROOT_DIR, outputPath)}`,
    );
  }

  // Step 7: Build tag index first (needed by graph builder for tag nodes)
  console.log("\n--- Step 7: Building tag index ---");
  const tagIndex = buildTagIndex(allPageData);
  const tagIndexDir = path.join(outputDir, "_data");
  await fs.ensureDir(tagIndexDir);
  const tagIndexPath = path.join(tagIndexDir, "tagIndex.json");
  await fs.writeJson(tagIndexPath, tagIndex, { spaces: 2 });
  console.log(
    `[tags] Wrote ${Object.keys(tagIndex).length} tags to tagIndex.json (${stats.tagsExtracted} total tag references)`,
  );

  // Step 8: Build and write graph.json + run visualizer preprocess hooks
  console.log("\n--- Step 8: Building graph data + visualizer hooks ---");
  const graphData = buildGraph(perPageLinks, tagIndex);
  const graphPath = path.join(outputDir, "graph.json");
  await fs.writeJson(graphPath, graphData, { spaces: 2 });
  console.log(
    `[graph] Wrote ${graphData.nodes.length} nodes, ${graphData.links.length} links to graph.json`,
  );

  // Auto-discover preprocess-hook.js in each visualizer folder and call it.
  // Visualizers export preprocessHook({ contentDir, outputDir }) to generate
  // any additional files they need — no manual wiring required.
  const hookFiles = await glob("lib/visualizers/*/preprocess-hook.js", {
    cwd: ROOT_DIR,
  });
  for (const hookFile of hookFiles) {
    try {
      const mod = await import(pathToFileURL(path.join(ROOT_DIR, hookFile)).href);
      if (typeof mod.preprocessHook === "function") {
        console.log(`[preprocess] Running hook: ${hookFile}`);
        await mod.preprocessHook({ contentDir, outputDir });
      }
    } catch (e) {
      console.warn(`[preprocess] Hook failed (${hookFile}): ${e.message}`);
    }
  }

  // Step 8.5: Write bloobObjects.json
  // Resolve raw image fields to root-relative URL paths for direct use in templates.
  // The `imageUrl` field is what templates should use for <img src>; `image` keeps the raw value.
  console.log("\n--- Step 8.5: Writing bloobObjects.json ---");
  const bloobObjectsPath = path.join(outputDir, "_data", "bloobObjects.json");
  const resolvedRegistry = {};
  for (const [type, data] of Object.entries(bloobObjectsRegistry)) {
    let imageUrl = null;
    if (data.image === "default") {
      imageUrl = null; // banner.njk falls back to /assets/objects/[type].png (marble.png)
    } else {
      const relPath = parseObjectImageField(data.image);
      if (relPath) {
        // Convert decoded filesystem path to root-relative URL (encode each segment)
        imageUrl = "/" + relPath.split("/").map((p) => encodeURIComponent(p)).join("/");
      }
    }
    resolvedRegistry[type] = { ...data, imageUrl };
  }
  await fs.writeJson(bloobObjectsPath, resolvedRegistry, { spaces: 2 });
  console.log(
    `[bloob-objects] Wrote ${Object.keys(resolvedRegistry).length} object types to bloobObjects.json`,
  );

  // Step 9: Copy attachments (vault structure preserved — files land at vault-relative paths)
  console.log("\n--- Step 9: Copying attachments ---");
  const { copied } = await copyAttachments(
    contentDir,
    obsidianConfig.attachmentFolderPath,
    staticDir,
  );
  stats.attachmentsCopied = copied.length;

  // Step 9.5: Auto-generate folder index stubs
  // For each top-level content subdirectory that has pages but no user-provided index.md,
  // write a stub that renders the folder-index layout (lists all pages in that collection).
  // If the user's vault has an index.md in a folder, that file was already written in Step 6
  // and takes priority — we skip stub generation for that folder.
  console.log("\n--- Step 9.5: Generating folder index stubs ---");
  const SKIP_DIRS = new Set(["media", "assets", "tags", "pagefind", "og", "search"]);
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });

    // Build a set of slugs claimed by root-level .md files (e.g. "Notes.md" → "notes").
    // If a root file's slug matches a folder name, that file likely owns the permalink — skip stub.
    const rootFileSlugs = new Set(
      entries
        .filter((e) => !e.isDirectory() && e.name.endsWith(".md"))
        .map((e) => e.name.slice(0, -3).toLowerCase().replace(/\s+/g, "-"))
    );

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const folderSlug = entry.name;
      const indexPath = path.join(outputDir, folderSlug, "index.md");

      // Skip if an index file already exists — either user-provided index.md (Step 6)
      // or a theme-provided index.njk assembled into src by assemble-src.js.
      // Both claim the same permalink so generating a stub would cause a conflict.
      if (await fs.pathExists(indexPath)) continue;
      const folderContents = await fs.readdir(path.join(outputDir, folderSlug));
      if (folderContents.some((f) => f.startsWith("index.") && f !== "index.md")) continue;

      // Skip if a root-level file claims the same permalink slug (e.g. Notes.md → /notes/)
      if (rootFileSlugs.has(folderSlug.toLowerCase())) {
        console.log(`[folder-index] Skipping stub for /${folderSlug}/ — root file claims this slug`);
        continue;
      }

      // Display name: capitalise each word
      const folderDisplay = folderSlug
        .split(/[-_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      // Stub bypasses the preprocessor's Step 6 (it's written directly to src-*/).
      // All frontmatter that Step 6 would auto-inject for user-written index.md files
      // must be baked in here. The bloob-shape is declared for documentation/tooling;
      // renderFilescope() does not run on stubs — the container div is inlined directly.
      const stub = [
        "---",
        `bloob-shape: folder-preview`,
        `layout: layouts/folder-index.njk`,
        `permalink: /${folderSlug}/`,
        `folder: ${folderSlug}`,
        `title: ${folderDisplay}`,
        `folder_display: ${folderDisplay}`,
        "---",
        "",
        `<div class="folder-preview-visualizer" data-pagefind-ignore data-fp-settings='{}'></div>`,
        "",
      ].join("\n");

      await fs.writeFile(indexPath, stub, "utf-8");
      console.log(`[folder-index] Generated stub for /${folderSlug}/`);
    }
  } catch (e) {
    console.warn(`[folder-index] Stub generation failed: ${e.message}`);
  }

  // Validation report: broken links
  if (brokenLinkDetails.length > 0) {
    console.log("\n========================================");
    console.log("  VALIDATION REPORT: BROKEN LINKS");
    console.log("========================================");
    for (const item of brokenLinkDetails) {
      console.log(`  [${item.type}] ${item.source} → ${item.target}`);
    }
    console.log(`\n  Total: ${brokenLinkDetails.length} broken link(s)`);
    console.log("========================================\n");
  }

  // Write validation report JSON for CI consumption
  const validationReport = {
    timestamp: new Date().toISOString(),
    brokenLinks: brokenLinkDetails,
    stats: {
      totalBroken: brokenLinkDetails.length,
      totalResolved: stats.linksResolved,
    },
  };
  const reportPath = path.join(outputDir, "_data", "validation-report.json");
  await fs.writeJson(reportPath, validationReport, { spaces: 2 });

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

  return { ...stats, brokenLinkDetails };
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

  // Optional --content-dir flag for local dev (skips GitHub clone)
  const contentDirArg = process.argv
    .find((a) => a.startsWith("--content-dir="))
    ?.replace("--content-dir=", "");
  const contentDir = contentDirArg ? path.resolve(contentDirArg) : undefined;

  preprocessContent({ ...(contentDir && { contentDir }) })
    .then((stats) => {
      console.log("Preprocessing completed successfully!");
    })
    .catch((error) => {
      console.error("Preprocessing failed:", error.message);
      process.exit(1);
    });
}
