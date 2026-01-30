/**
 * Obsidian Config Reader
 * Reads .obsidian/app.json to extract vault configuration.
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Default configuration values if .obsidian/app.json doesn't exist
 * or is missing certain fields.
 */
const DEFAULTS = {
  attachmentFolderPath: '.', // Same folder as the note
  useMarkdownLinks: false,   // Wiki-links by default
};

/**
 * Reads the Obsidian configuration from a content directory.
 * @param {string} contentDir - Path to the cloned content directory
 * @returns {Object} Configuration object with attachment folder path and other settings
 */
export async function readObsidianConfig(contentDir) {
  const configPath = path.join(contentDir, '.obsidian', 'app.json');

  console.log(`[config] Looking for Obsidian config at: ${configPath}`);

  if (!await fs.pathExists(configPath)) {
    console.log('[config] No .obsidian/app.json found, using defaults');
    return { ...DEFAULTS };
  }

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Normalize attachment folder path
    let attachmentFolder = config.attachmentFolderPath || DEFAULTS.attachmentFolderPath;

    // Remove leading ./ if present
    if (attachmentFolder.startsWith('./')) {
      attachmentFolder = attachmentFolder.slice(2);
    }

    const result = {
      attachmentFolderPath: attachmentFolder,
      useMarkdownLinks: config.useMarkdownLinks ?? DEFAULTS.useMarkdownLinks,
    };

    console.log(`[config] Attachment folder: ${result.attachmentFolderPath}`);
    console.log(`[config] Uses markdown links: ${result.useMarkdownLinks}`);

    return result;
  } catch (error) {
    console.warn(`[config] Error reading config: ${error.message}, using defaults`);
    return { ...DEFAULTS };
  }
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const contentDir = process.argv[2] || './content-source';

  readObsidianConfig(contentDir)
    .then((config) => {
      console.log('[config] Result:', JSON.stringify(config, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
