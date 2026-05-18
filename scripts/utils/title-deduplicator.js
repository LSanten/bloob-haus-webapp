/**
 * Strips the leading H1 heading from markdown content when it duplicates
 * the page title. This prevents double-rendering when the template already
 * renders <h1>{{ title }}</h1> from frontmatter.
 *
 * Only strips an exact H1 (`# `). H2 and deeper headings are left untouched.
 * Inline markdown in the heading (bold, italic, code, links) is stripped
 * before comparison so `# Hello *world*` matches a title of `Hello world`.
 *
 * @param {string} content - Markdown content (frontmatter already removed)
 * @param {string} pageTitle - The resolved page title from frontmatter/index
 * @returns {string} Content with the leading H1 removed if it matched
 */
export function stripLeadingTitleHeading(content, pageTitle) {
  if (!content || !pageTitle) return content;

  const leadingH1 = content.match(/^\s*# (.+?)(?:\s*\{#[^}]+\})?\s*\n/);
  if (!leadingH1) return content;

  const headingText = leadingH1[1]
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  if (headingText.toLowerCase() !== pageTitle.toLowerCase()) return content;

  // Remove the heading line and the immediately following blank line (if any)
  return content.replace(/^\s*# .+\n\n?/, "");
}
