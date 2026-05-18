/**
 * Transclusion Handler
 * Handles ![[Page Name]] embeds by expanding the target page's content inline.
 *
 * When a fileIndex is supplied, the target page's content is embedded directly.
 * When no fileIndex is supplied (or the target can't be resolved), falls back to
 * a visible placeholder with a link — backward-compatible with the old behaviour.
 *
 * Outstanding (not yet implemented):
 *   - Heading-level slice: ![[Page#Heading]] embeds the full page, ignoring the
 *     heading specifier. Tracked in docs/TECH-DEBT.md.
 *   - Block-level slice: ![[Page#^blockid]] — same treatment.
 */

import { getSlugFunction } from "./slug-strategy.js";
import { resolveLink } from "./file-index-builder.js";
import { stripComments } from "./comment-stripper.js";

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.mp4', '.webm', '.html'];

function isMediaFile(target) {
  const lower = target.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

// Bump all ATX headings down one level: H1→H2, H2→H3, ..., H5→H6 (H6 stays).
function bumpHeadings(markdown) {
  return markdown.replace(/^(#{1,5})(\s)/gm, (_, hashes, space) => '#' + hashes + space);
}

function makePlaceholder(target) {
  const strategy = process.env.SLUG_STRATEGY || "slugify";
  const slug = getSlugFunction(strategy)(target);
  return `<div class="transclusion-placeholder">
  <p><strong>Embedded content:</strong> ${target}</p>
  <p class="transclusion-note"><em>Could not embed. <a href="/${slug}/">View "${target}" →</a></em></p>
</div>`;
}

/**
 * Handles ![[Page Name]] embeds.
 *
 * @param {string} content - Markdown content to process
 * @param {Object|null} fileIndex - Index from buildFileIndex (null → placeholder fallback)
 * @param {Object} [options]
 * @param {Set<string>} [options.visited] - fullSlugs already in the current embed chain
 * @param {string|null} [options.sourceFile] - fullSlug of the file being processed
 * @returns {{ content: string, transclusions: Array<{target: string, original: string}> }}
 */
export function handleTransclusions(content, fileIndex = null, { visited = new Set(), sourceFile = null } = {}) {
  const transclusions = [];
  const transclusionPattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  const processedContent = content.replace(transclusionPattern, (match, target) => {
    if (isMediaFile(target)) return match;

    const trimmedTarget = target.trim();
    transclusions.push({ target: trimmedTarget, original: match });

    if (!fileIndex) {
      return makePlaceholder(trimmedTarget);
    }

    // Strip heading/block specifier before resolving ("note#heading" → "note")
    const hashIndex = trimmedTarget.indexOf('#');
    const hasSpecifier = hashIndex !== -1;
    const resolveTarget = hasSpecifier ? trimmedTarget.slice(0, hashIndex).trim() : trimmedTarget;

    const { url, fullSlug, found } = resolveLink(resolveTarget, fileIndex);

    if (!found || !fullSlug) {
      console.log(`[transclusion] Could not resolve "${trimmedTarget}" — using placeholder`);
      return makePlaceholder(trimmedTarget);
    }

    // Cycle detection
    if (visited.has(fullSlug) || fullSlug === sourceFile) {
      console.log(`[transclusion] Cycle detected for "${trimmedTarget}" — linking instead`);
      return `<a class="internal-link" href="${url}">${trimmedTarget}</a>`;
    }

    const pageEntry = fileIndex.pages[fullSlug];
    if (!pageEntry?.rawBody) {
      console.log(`[transclusion] No content for "${trimmedTarget}" — using placeholder`);
      return makePlaceholder(trimmedTarget);
    }

    if (hasSpecifier) {
      console.log(`[transclusion] "${trimmedTarget}" — heading/block slice not yet supported, embedding full page`);
    }

    // Recursively expand nested transclusions in the embedded content
    const newVisited = new Set(visited);
    if (sourceFile) newVisited.add(sourceFile);
    newVisited.add(fullSlug);

    let embeddedContent = stripComments(pageEntry.rawBody);
    embeddedContent = bumpHeadings(embeddedContent);
    const nested = handleTransclusions(embeddedContent, fileIndex, {
      visited: newVisited,
      sourceFile: fullSlug,
    });
    embeddedContent = nested.content;

    console.log(`[transclusion] Expanded "${trimmedTarget}"`);
    return `<div class="transclusion-embed" data-source="${url}">\n\n${embeddedContent}\n\n</div>`;
  });

  if (transclusions.length > 0) {
    console.log(`[transclusion] Found ${transclusions.length} transclusion(s) in processing`);
    for (const t of transclusions) {
      console.log(`[transclusion]   - ${t.target}`);
    }
  }

  return { content: processedContent, transclusions };
}
