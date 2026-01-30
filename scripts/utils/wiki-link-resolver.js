/**
 * Wiki-Link Resolver
 * Converts [[wiki-links]] to standard markdown links with resolved URLs.
 */

/**
 * Resolves wiki-links in markdown content to standard links.
 * Handles: [[Page Name]], [[Page Name|Display Text]], [[Page Name#Heading]]
 *
 * @param {string} content - Markdown content with wiki-links
 * @param {Object} index - File index from buildFileIndex()
 * @returns {Object} { content, resolved, broken } - processed content and link stats
 */
export function resolveWikiLinks(content, index) {
  const resolved = [];
  const broken = [];

  // Pattern matches [[target]] or [[target|display]] or [[target#heading]] or [[target#heading|display]]
  // Does NOT match ![[...]] (transclusions/embeds)
  const wikiLinkPattern = /(?<!!)\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

  const processedContent = content.replace(wikiLinkPattern, (match, target, heading, displayText) => {
    const trimmedTarget = target.trim();
    const display = displayText?.trim() || (heading ? `${trimmedTarget}#${heading}` : trimmedTarget);

    // Try to resolve the link
    const { url, found } = resolveLinkTarget(trimmedTarget, index);

    if (found) {
      const fullUrl = heading ? `${url}#${slugifyHeading(heading)}` : url;
      resolved.push({ target: trimmedTarget, url: fullUrl });
      return `[${display}](${fullUrl})`;
    } else {
      broken.push({ target: trimmedTarget, original: match });
      // Return a broken link with a special class for styling
      return `<span class="broken-link" data-target="${trimmedTarget}">${display}</span>`;
    }
  });

  return { content: processedContent, resolved, broken };
}

/**
 * Resolves a link target to a URL using the index.
 * @param {string} target - The link target (title or filename)
 * @param {Object} index - The file index
 * @returns {Object} { url, found }
 */
function resolveLinkTarget(target, index) {
  const normalized = target.toLowerCase().replace(/\.md$/, '');

  // Try title lookup
  if (index.titleLookup[normalized]) {
    const fullSlug = index.titleLookup[normalized];
    return { url: index.pages[fullSlug].url, found: true };
  }

  // Try filename lookup
  if (index.filenameLookup[normalized]) {
    const fullSlug = index.filenameLookup[normalized];
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
  // Simple test
  const testContent = `
# Test Page

Check out [[Fluffy Millet Quinoa-Cake]] for a great recipe.

Also see [[Nonexistent Page]] which doesn't exist.

And [[Some Recipe|click here]] for an alias.
`;

  const mockIndex = {
    pages: {
      'recipes/fluffy-millet-quinoa-cake': {
        title: 'Fluffy Millet Quinoa-Cake',
        url: '/recipes/fluffy-millet-quinoa-cake/',
      },
    },
    titleLookup: {
      'fluffy millet quinoa-cake': 'recipes/fluffy-millet-quinoa-cake',
    },
    filenameLookup: {
      'fluffy millet quinoa-cake': 'recipes/fluffy-millet-quinoa-cake',
    },
  };

  const result = resolveWikiLinks(testContent, mockIndex);
  console.log('Processed content:');
  console.log(result.content);
  console.log('\nResolved links:', result.resolved);
  console.log('Broken links:', result.broken);
}
