/**
 * Markdown Link Resolver
 * Resolves standard markdown links like [text](file.md) to proper URLs.
 */

import { isMainModule } from "./is-main.js";
import { slugifyHeading } from "./slug-strategy.js";

/**
 * Resolves markdown links pointing to .md files to proper URLs.
 * Handles: [text](file.md), [text](folder/file.md), [text](file%20name.md)
 *
 * @param {string} content - Markdown content with links
 * @param {Object} index - File index from buildFileIndex()
 * @returns {Object} { content, resolved, broken } - processed content and link stats
 */
export function resolveMarkdownLinks(content, index) {
  const resolved = [];
  const broken = [];

  // Pattern matches [text](target.md) or [text](target.md#heading)
  // Also handles URL-encoded paths like [text](file%20name.md)
  const mdLinkPattern = /\[([^\]]+)\]\(([^)]+\.md(?:#[^)]*)?)\)/g;

  const processedContent = content.replace(mdLinkPattern, (match, displayText, target) => {
    // Decode URL-encoded characters (e.g., %20 → space)
    const decodedTarget = decodeURIComponent(target);

    // Split off any heading anchor
    const [filePath, heading] = decodedTarget.split('#');
    const trimmedPath = filePath.trim();

    // Extract just the filename without path or extension
    const filename = trimmedPath
      .replace(/^.*\//, '')  // Remove path
      .replace(/\.md$/, ''); // Remove extension

    // Try to resolve the link (full path first to handle same filename in multiple folders)
    const fullPath = trimmedPath.replace(/\.md$/, "");
    const { url, found } = resolveLinkTarget(filename, index, fullPath);

    if (found) {
      const fullUrl = heading ? `${url}#${slugifyHeading(heading)}` : url;
      resolved.push({ target: trimmedPath, url: fullUrl });
      return `[${displayText}](${fullUrl})`;
    } else {
      broken.push({ target: trimmedPath, original: match });
      // Return a broken link with a special class for styling
      return `<span class="broken-link" data-target="${trimmedPath}">${displayText}</span>`;
    }
  });

  return { content: processedContent, resolved, broken };
}

/**
 * Resolves a link target to a URL using the index.
 * @param {string} target - The filename (without extension)
 * @param {Object} index - The file index
 * @param {string|null} fullPath - Full relative path without extension (e.g. "resources/index")
 * @returns {Object} { url, found }
 */
function resolveLinkTarget(target, index, fullPath = null) {
  // Try the full relative path first — handles same filename in multiple folders
  // (e.g. resources/index.md vs playlists/index.md both named "index").
  // Normalized with lowercase + forward slashes; no slug transformation applied,
  // so folder names with spaces won't match — filename fallback handles that.
  if (fullPath) {
    const key = fullPath.toLowerCase().replace(/\\/g, "/");
    if (index.pages[key]) {
      return { url: index.pages[key].url, found: true };
    }
    // Folder index files moved from pages["resources/index"] → pages["resources"].
    // filenameLookup["resources/index"] still maps to the correct fullSlug.
    if (index.filenameLookup[key]) {
      const fullSlug = index.filenameLookup[key];
      if (index.pages[fullSlug]) return { url: index.pages[fullSlug].url, found: true };
    }
  }

  const normalized = target.toLowerCase();

  // Try filename lookup first
  if (index.filenameLookup[normalized]) {
    const fullSlug = index.filenameLookup[normalized];
    return { url: index.pages[fullSlug].url, found: true };
  }

  // Try title lookup
  if (index.titleLookup[normalized]) {
    const fullSlug = index.titleLookup[normalized];
    return { url: index.pages[fullSlug].url, found: true };
  }

  // Try normalized (no special chars) filename lookup
  const normalizedNoSpecial = normalized.replace(/[^a-z0-9]/g, '');
  if (index.filenameLookup[normalizedNoSpecial]) {
    const fullSlug = index.filenameLookup[normalizedNoSpecial];
    return { url: index.pages[fullSlug].url, found: true };
  }

  return { url: null, found: false };
}

// slugifyHeading is imported from slug-strategy.js

// Test if run directly
if (isMainModule(import.meta.url)) {
  // Simple test with URL-encoded links like in your recipes
  const testContent = `
# Our Favorites

## Really fast and easy

- [Cauliflower Stir Fry](Cauliflower%20Stir%20Fry.md)
- [Broccoli Stir Fry](Broccoli%20Stir%20Fry.md)
- [Nonexistent Recipe](Does%20Not%20Exist.md)
`;

  const mockIndex = {
    pages: {
      'recipes/cauliflower-stir-fry': {
        title: 'Cauliflower Stir Fry',
        url: '/recipes/cauliflower-stir-fry/',
      },
      'recipes/broccoli-stir-fry': {
        title: 'Broccoli Stir Fry',
        url: '/recipes/broccoli-stir-fry/',
      },
    },
    titleLookup: {
      'cauliflower stir fry': 'recipes/cauliflower-stir-fry',
      'broccoli stir fry': 'recipes/broccoli-stir-fry',
    },
    filenameLookup: {
      'cauliflower stir fry': 'recipes/cauliflower-stir-fry',
      'broccoli stir fry': 'recipes/broccoli-stir-fry',
    },
  };

  const result = resolveMarkdownLinks(testContent, mockIndex);
  console.log('Processed content:');
  console.log(result.content);
  console.log('\nResolved links:', result.resolved);
  console.log('Broken links:', result.broken);
}
