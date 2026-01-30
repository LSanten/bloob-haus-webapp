/**
 * Publish Filter
 * Filters markdown files based on publish mode (allowlist or blocklist).
 */

import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";

/**
 * Default configuration for publish filtering.
 */
const DEFAULTS = {
  publishMode: "blocklist",
  blocklistTag: "not-for-public",
  allowlistKey: "publish",
  allowlistValue: true,
};

/**
 * Reads publish configuration from environment variables.
 * @returns {Object} Publish configuration
 */
function getPublishConfig() {
  return {
    publishMode: process.env.PUBLISH_MODE || DEFAULTS.publishMode,
    blocklistTag: process.env.BLOCKLIST_TAG || DEFAULTS.blocklistTag,
    allowlistKey: process.env.ALLOWLIST_KEY || DEFAULTS.allowlistKey,
    allowlistValue:
      process.env.ALLOWLIST_VALUE === "false" ? false : DEFAULTS.allowlistValue,
  };
}

/**
 * Determines if a file should be published based on the current mode.
 * @param {Object} frontmatter - Parsed frontmatter from the file
 * @param {string} content - The markdown content (body) of the file
 * @param {Object} config - Publish configuration
 * @returns {boolean} True if file should be published
 */
function shouldPublish(frontmatter, content, config) {
  if (config.publishMode === "allowlist") {
    // Only publish if explicitly marked
    return frontmatter[config.allowlistKey] === config.allowlistValue;
  } else {
    // Blocklist mode: publish unless tagged private
    const tagInContent = content.includes(`#${config.blocklistTag}`);

    // Check frontmatter tags - handle both "tag" and "#tag" formats
    const tagInFrontmatter =
      Array.isArray(frontmatter.tags) &&
      frontmatter.tags.some(
        (tag) =>
          tag === config.blocklistTag || tag === `#${config.blocklistTag}`,
      );

    return !tagInContent && !tagInFrontmatter;
  }
}

/**
 * Filters markdown files in a directory based on publish settings.
 * @param {string} contentDir - Path to the content directory
 * @param {Object} options - Optional configuration overrides
 * @returns {Object} Results with published and excluded file lists
 */
export async function filterPublishableFiles(contentDir, options = {}) {
  const config = { ...getPublishConfig(), ...options };

  console.log(`[filter] Mode: ${config.publishMode}`);
  if (config.publishMode === "blocklist") {
    console.log(`[filter] Blocklist tag: #${config.blocklistTag}`);
  } else {
    console.log(
      `[filter] Allowlist: ${config.allowlistKey}: ${config.allowlistValue}`,
    );
  }

  // Find all markdown files
  const pattern = path.join(contentDir, "**/*.md");
  const files = await glob(pattern, { nodir: true });

  console.log(`[filter] Found ${files.length} markdown files`);

  const published = [];
  const excluded = [];

  for (const filePath of files) {
    // Skip files in .obsidian folder
    if (filePath.includes(".obsidian")) {
      continue;
    }

    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data: frontmatter, content } = matter(fileContent);

    const relativePath = path.relative(contentDir, filePath);

    if (shouldPublish(frontmatter, content, config)) {
      published.push({
        path: filePath,
        relativePath,
        frontmatter,
      });
    } else {
      excluded.push({
        path: filePath,
        relativePath,
        reason:
          config.publishMode === "blocklist"
            ? `contains #${config.blocklistTag}`
            : `missing ${config.allowlistKey}: ${config.allowlistValue}`,
      });
      console.log(`[filter] Excluding: ${relativePath}`);
    }
  }

  console.log(`[filter] Publishing: ${published.length} files`);
  console.log(`[filter] Excluding: ${excluded.length} files`);

  return { published, excluded, config };
}

/**
 * Removes excluded files from the content directory.
 * @param {Array} excludedFiles - List of files to remove
 */
export async function removeExcludedFiles(excludedFiles) {
  for (const file of excludedFiles) {
    await fs.remove(file.path);
    console.log(`[filter] Removed: ${file.relativePath}`);
  }
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Load environment variables from .env.local
  const rootDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../..",
  );
  const envPath = path.join(rootDir, ".env.local");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }

  const contentDir = process.argv[2] || "./content-source";
  const dryRun = process.argv.includes("--dry-run");

  filterPublishableFiles(contentDir)
    .then(async ({ published, excluded }) => {
      console.log("\n[filter] === Summary ===");
      console.log(`Will publish: ${published.length} files`);
      console.log(`Will exclude: ${excluded.length} files`);

      if (!dryRun && excluded.length > 0) {
        console.log("\n[filter] Removing excluded files...");
        await removeExcludedFiles(excluded);
      } else if (dryRun) {
        console.log("\n[filter] Dry run - no files removed");
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
