/**
 * Comment Stripper
 * Removes Obsidian-style comments (%% ... %%) and HTML comments from markdown.
 */

/**
 * Strips comments from markdown content.
 * Handles: %% inline comments %%, %% multiline comments %%
 *
 * @param {string} content - Markdown content with comments
 * @returns {string} Content with comments removed
 */
export function stripComments(content) {
  let processedContent = content;

  // Remove Obsidian-style comments: %% ... %%
  // This handles both inline and multiline comments
  processedContent = processedContent.replace(/%%[\s\S]*?%%/g, '');

  // Remove HTML comments: <!-- ... -->
  processedContent = processedContent.replace(/<!--[\s\S]*?-->/g, '');

  // Clean up any extra whitespace left behind
  processedContent = processedContent.replace(/\n\n\n+/g, '\n\n');

  return processedContent;
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testContent = `
# Recipe Title

This is some content.

%% This is a private comment %%

More content here.

%%
Multiline comment
that should be removed
%%

Final content.

<!-- HTML comment -->

End.
`;

  const result = stripComments(testContent);
  console.log('Processed content:');
  console.log(result);
}
