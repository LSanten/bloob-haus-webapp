/**
 * Markdown Link Resolver
 * Resolves standard markdown links like [text](file.md) to proper URLs.
 */

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

    // Try to resolve the link
    const { url, found } = resolveLinkTarget(filename, index);

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
 * @returns {Object} { url, found }
 */
function resolveLinkTarget(target, index) {
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

/**
 * Converts a heading to a URL-safe anchor.
 * @param {string} heading - The heading text
 * @returns {string} URL-safe anchor
 */
function slugifyHeading(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
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
