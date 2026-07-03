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
 * Maps known snippet fence names to the location where they are auto-injected.
 * Every fence found in the body is exposed as `site.embeds[name]`; only the fences
 * listed here are concatenated into `site.snippets.{head,bodyEnd}` for automatic
 * injection by the shared partials. Fences not listed (e.g. `fast-comments-embed`,
 * custom `embed-*`) are still available as `site.embeds[name]` for manual placement.
 */
export const EMBED_TARGETS = {
  "header-snippet": "head",
  "goat-counter-tracking": "head",
  "footer-snippet": "bodyEnd",
  "embed-endofbody": "bodyEnd",
  // "fast-comments-embed" is intentionally omitted — comments are placed at
  // content-bottom by the page layout, not blindly before </body> (see Milestone B).
};

/**
 * Parses named fenced code blocks out of a markdown body into a map of raw snippets.
 * Only fences with a name token are captured (e.g. ```goat-counter-tracking). Empty
 * fences are skipped — an empty fence is how a user leaves a feature off.
 *
 * @param {string} markdownBody - The body (non-frontmatter) portion of _bloob-settings.md
 * @returns {Object} Map of `{ [fenceName]: rawContent }`, empty fences omitted
 */
export function parseEmbedFences(markdownBody) {
  const embeds = {};
  if (!markdownBody) return embeds;

  const lines = markdownBody.split(/\r?\n/);
  let currentName = null;
  let buffer = [];

  for (const line of lines) {
    if (currentName === null) {
      // Opening fence must carry a name token, e.g. ```goat-counter-tracking
      const open = line.match(/^```+\s*([\w-]+)\s*$/);
      if (open) {
        currentName = open[1];
        buffer = [];
      }
      continue;
    }

    // Inside a fence — a bare closing fence ends it
    if (/^```+\s*$/.test(line)) {
      const raw = buffer.join("\n").trim();
      if (raw) embeds[currentName] = raw;
      currentName = null;
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  return embeds;
}

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
    const { data: frontmatter, content: body } = matter(content);

    // Snippet fences live in the body (never frontmatter — raw <script> would break YAML).
    frontmatter._embeds = parseEmbedFences(body);

    console.log(`[bloob-settings] Found settings for: ${frontmatter.name || "unnamed site"}`);
    const embedNames = Object.keys(frontmatter._embeds);
    if (embedNames.length) {
      console.log(`[bloob-settings] Found ${embedNames.length} snippet fence(s): ${embedNames.join(", ")}`);
    }

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
    footer_searchbar: bloobSettings.footer_searchbar ?? siteConfig.site?.footer_searchbar ?? false,
    // Logo/favicon: wiki-link [[filename]] or plain path; resolved to /media/ URL by assemble-src
    logo: bloobSettings.logo || siteConfig.site?.logo,
    favicon: bloobSettings.favicon || siteConfig.site?.favicon,
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
  if (bloobSettings.publish_mode || bloobSettings.blocklist_tag || bloobSettings.exclude_files || bloobSettings.status_field || bloobSettings.publish_by_default !== undefined) {
    merged.content = {
      ...siteConfig.content,
      publish_mode: bloobSettings.publish_mode || siteConfig.content?.publish_mode,
      blocklist_tag: bloobSettings.blocklist_tag || siteConfig.content?.blocklist_tag,
      exclude_files: bloobSettings.exclude_files || siteConfig.content?.exclude_files,
      status_field: bloobSettings.status_field || siteConfig.content?.status_field,
      ...(bloobSettings.publish_by_default !== undefined && { publish_by_default: bloobSettings.publish_by_default }),
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

  // Default shape — applied to pages with no explicit bloob-shape in frontmatter.
  // Only influences layout selection; body rendering (renderFilescope) is never triggered
  // by the default. When the named shape has no visualizer folder yet, it logs a warning
  // and falls through to page.njk — so declaring a future shape name is safe.
  if (bloobSettings.default_shape) {
    merged.default_shape = bloobSettings.default_shape;
  }

  // Snippet embeds — raw code fences parsed from the settings body (see parseEmbedFences).
  if (bloobSettings._embeds && Object.keys(bloobSettings._embeds).length) {
    merged.embeds = { ...siteConfig.embeds, ...bloobSettings._embeds };
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
