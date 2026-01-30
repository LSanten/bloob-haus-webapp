/**
 * Transclusion Handler
 * Handles ![[Page Name]] embeds by converting them to placeholders.
 * Full transclusion support is planned for Phase 2.
 */

// Common image extensions to exclude from transclusion handling
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.mp4', '.webm', '.html'];

/**
 * Checks if a path looks like an image/media file.
 * @param {string} target - The embed target
 * @returns {boolean} True if it appears to be a media file
 */
function isMediaFile(target) {
  const lower = target.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/**
 * Converts transclusion embeds to placeholder elements.
 * Transclusions are ![[Page Name]] that embed another page's content.
 *
 * @param {string} content - Markdown content with transclusions
 * @returns {Object} { content, transclusions } - processed content and list of transclusions
 */
export function handleTransclusions(content) {
  const transclusions = [];

  // Pattern matches ![[target]] but we need to exclude images which were already handled
  const transclusionPattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  const processedContent = content.replace(transclusionPattern, (match, target, altText) => {
    // Skip if this looks like an image/media file (already handled by attachment resolver)
    if (isMediaFile(target)) {
      return match; // Leave it for attachment resolver
    }

    const trimmedTarget = target.trim();
    transclusions.push({ target: trimmedTarget, original: match });

    // Convert to a visible placeholder
    return `<div class="transclusion-placeholder">
  <p><strong>Embedded content:</strong> ${trimmedTarget}</p>
  <p class="transclusion-note"><em>Transclusion not yet supported. <a href="/${slugify(trimmedTarget)}/">View "${trimmedTarget}" →</a></em></p>
</div>`;
  });

  if (transclusions.length > 0) {
    console.log(`[transclusion] Found ${transclusions.length} transclusion(s) - converted to placeholders`);
    for (const t of transclusions) {
      console.log(`[transclusion]   - ${t.target}`);
    }
  }

  return { content: processedContent, transclusions };
}

/**
 * Simple slugify for generating placeholder links.
 * @param {string} title - The title to slugify
 * @returns {string} URL-safe slug
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testContent = `
# Main Recipe

Here's the base recipe:

![[Base Dough Recipe]]

And here's an image (should NOT be converted):

![[photo.jpg]]

Another embed with alias:

![[Spice Mix|Our special spice blend]]
`;

  const result = handleTransclusions(testContent);
  console.log('Processed content:');
  console.log(result.content);
  console.log('\nTransclusions found:', result.transclusions);
}
