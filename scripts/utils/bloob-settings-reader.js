/**
 * Bloob Settings Reader
 * Reads _bloob-settings.md from a content directory and parses its frontmatter.
 * This file is the source of truth for site-level settings (name, description, footer_text, etc.)
 */

import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";

const SETTINGS_FILENAME = "_bloob-settings.md";

/**
 * Reads and parses _bloob-settings.md from a content directory.
 * @param {string} contentDir - Path to the content directory
 * @returns {Object|null} Parsed frontmatter settings, or null if file not found
 */
export async function readBloobSettings(contentDir) {
  const settingsPath = path.join(contentDir, SETTINGS_FILENAME);

  console.log(`[bloob-settings] Looking for settings at: ${settingsPath}`);

  if (!fs.existsSync(settingsPath)) {
    console.log("[bloob-settings] No _bloob-settings.md found");
    return null;
  }

  try {
    const content = await fs.readFile(settingsPath, "utf-8");
    const { data: frontmatter } = matter(content);

    console.log(`[bloob-settings] Found settings for: ${frontmatter.name || "unnamed site"}`);

    return frontmatter;
  } catch (error) {
    console.warn(`[bloob-settings] Error reading settings: ${error.message}`);
    return null;
  }
}

/**
 * Merges bloob settings into a site config object.
 * Settings from _bloob-settings.md override corresponding fields in siteConfig.
 * @param {Object} siteConfig - Base config from sites/*.yaml
 * @param {Object} bloobSettings - Settings from _bloob-settings.md
 * @returns {Object} Merged configuration
 */
export function mergeBloobSettings(siteConfig, bloobSettings) {
  if (!bloobSettings) return siteConfig;

  // Map _bloob-settings.md fields to siteConfig structure
  const merged = { ...siteConfig };

  // Site-level settings
  merged.site = {
    ...siteConfig.site,
    name: bloobSettings.name || siteConfig.site?.name,
    description: bloobSettings.description || siteConfig.site?.description,
    author: bloobSettings.author || siteConfig.site?.author,
    language: bloobSettings.language || siteConfig.site?.language,
    footer_text: bloobSettings.footer_text || siteConfig.site?.footer_text,
  };

  // Theme
  if (bloobSettings.theme) {
    merged.theme = bloobSettings.theme;
  }

  // Permalinks
  if (bloobSettings.permalink_strategy) {
    merged.permalinks = {
      ...siteConfig.permalinks,
      strategy: bloobSettings.permalink_strategy,
    };
  }

  // Content settings
  if (bloobSettings.publish_mode || bloobSettings.blocklist_tag || bloobSettings.exclude_files) {
    merged.content = {
      ...siteConfig.content,
      publish_mode: bloobSettings.publish_mode || siteConfig.content?.publish_mode,
      blocklist_tag: bloobSettings.blocklist_tag || siteConfig.content?.blocklist_tag,
      exclude_files: bloobSettings.exclude_files || siteConfig.content?.exclude_files,
    };
  }

  // Visualizers
  if (bloobSettings.visualizers) {
    merged.visualizers = bloobSettings.visualizers;
  }

  // Features
  if (bloobSettings.features) {
    merged.features = {
      ...siteConfig.features,
      ...bloobSettings.features,
    };
  }

  // Media settings
  if (bloobSettings.media) {
    merged.media = {
      ...siteConfig.media,
      ...bloobSettings.media,
    };
  }

  // Mount path (for subdirectory publishing, e.g., leons.bloob.haus/marbles/)
  if (bloobSettings.mount_path) {
    merged.mount_path = bloobSettings.mount_path;
  }

  // Theme-specific settings — opaque bag passed through to site.theme_settings in templates
  if (bloobSettings.theme_settings) {
    merged.theme_settings = {
      ...siteConfig.theme_settings,
      ...bloobSettings.theme_settings,
    };
  }

  return merged;
}
