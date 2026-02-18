/**
 * Shared mock file index factory for tests.
 * Creates index objects that match the shape produced by buildFileIndex().
 */

/**
 * Creates a mock file index from a simple page list.
 * @param {Array<{slug: string, title: string, url: string}>} pages
 * @returns {Object} Index matching buildFileIndex() output shape
 */
export function createMockIndex(pages) {
  const index = {
    pages: {},
    titleLookup: {},
    filenameLookup: {},
  };

  for (const page of pages) {
    index.pages[page.slug] = {
      title: page.title,
      url: page.url,
    };

    // Title lookup: lowercase title → slug
    index.titleLookup[page.title.toLowerCase()] = page.slug;

    // Filename lookup: last segment of slug → slug
    const filename = page.slug.split('/').pop();
    index.filenameLookup[filename] = page.slug;

    // Also add with spaces (as markdown files would have)
    const filenameWithSpaces = filename.replace(/-/g, ' ');
    if (filenameWithSpaces !== filename) {
      index.filenameLookup[filenameWithSpaces] = page.slug;
    }
  }

  return index;
}

/**
 * Creates a mock attachment index from a simple file list.
 * @param {Array<{filename: string, path: string}>} files
 * @returns {Object} Index matching buildAttachmentIndex() output shape
 */
export function createMockAttachmentIndex(files) {
  const index = {};

  for (const file of files) {
    index[file.filename] = file.path;
    // Add lowercase variant
    index[file.filename.toLowerCase()] = file.path;
  }

  return index;
}
