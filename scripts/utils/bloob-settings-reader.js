/**
 * Bloob Settings Reader
 * Reads _bloob-settings.md from a content directory and parses its frontmatter.
 * This file is the source of truth for site-level settings (name, description, footer_text, etc.)
 */

import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { normalizeUnlistedFolders } from "./unlisted-folders.js";
import { parseAiSwitches, repairAiLine } from "./ai-access.js";

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
 * Pre-concatenates the auto-injected fences into `site.snippets.{head,bodyEnd}` for the shared
 * partials (site-snippets-head.njk / site-snippets-footer.njk). The `structured-data` fence is not
 * a snippet: it is merged with the page's own data into one JSON-LD block per page
 * (partials/structured-data.njk, scripts/utils/structured-data.js).
 *
 * @param {Object} embeds - map from parseEmbedFences
 * @returns {{ head: string, bodyEnd: string }}
 */
export function composeSnippets(embeds = {}) {
  const snippets = { head: "", bodyEnd: "" };
  const add = (target, text) => {
    snippets[target] = snippets[target] ? `${snippets[target]}\n${text}` : text;
  };
  for (const [name, target] of Object.entries(EMBED_TARGETS)) {
    if (embeds[name]) add(target, embeds[name]);
  }
  return snippets;
}

/**
 * Extracts the GoatCounter site code from the `goat-counter-tracking` snippet.
 *
 * The user already pastes their tracking script, which carries the code in its
 * data-goatcounter URL (`https://CODE.goatcounter.com/count`). The visitor counter
 * needs that same code to call `https://CODE.goatcounter.com/counter/<path>.json`,
 * so it is derived rather than asked for a second time — one place to get wrong
 * instead of two.
 *
 * Self-hosted GoatCounter installs use an arbitrary host with no code subdomain;
 * those return null and the counter simply stays off.
 *
 * @param {Object} embeds - Map of fence name → raw content (see parseEmbedFences)
 * @returns {string|null} The site code (e.g. "melt"), or null if not derivable
 */
export function parseGoatCounterCode(embeds) {
  const snippet = embeds && embeds["goat-counter-tracking"];
  if (!snippet) return null;
  const m = String(snippet).match(
    /data-goatcounter\s*=\s*["']https?:\/\/([a-z0-9-]+)\.goatcounter\.com\//i,
  );
  return m ? m[1].toLowerCase() : null;
}

/**
 * Parses the text of _bloob-settings.md. One known mistake is repaired instead of failing: the
 * one-line `ai:` setting written with spaces after its colons (`ai: train: no`), which YAML can't
 * read. A file that doesn't parse loses every setting in it, the blocklist tag included, so that
 * line must never take the rest of the file down with it.
 *
 * @param {string} text
 * @returns {{data: Object, content: string}} gray-matter's result
 * @throws when the file doesn't parse and the ai: repair doesn't help
 */
export function parseSettingsText(text) {
  // Options passed on purpose: without them gray-matter caches a file *before* parsing it, so
  // after one failed parse the same text comes back as {} with no error, every setting gone.
  try {
    return matter(text, {});
  } catch (error) {
    const repaired = repairAiLine(text);
    if (!repaired) throw error;
    let result;
    try {
      result = matter(repaired, {});
    } catch {
      throw error; // broken somewhere else too: report the original problem
    }
    console.warn(
      `[bloob-settings] The ai: line has a space after a colon, which YAML can't read on one line. ` +
        `Read it as "${result.data.ai}". Write it without the spaces (ai: read_links:yes, search:yes, train:no) ` +
        `or one switch per line under ai:.`,
    );
    return result;
  }
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
    const { data: frontmatter, content: body } = parseSettingsText(content);

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
function withThemeOverride(siteConfig) {
  return process.env.THEME_OVERRIDE ? { ...siteConfig, theme: process.env.THEME_OVERRIDE } : siteConfig;
}

export function mergeBloobSettings(siteConfig, bloobSettings) {
  if (!bloobSettings) return withThemeOverride(siteConfig);

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
    // License for the site's writing (scripts/utils/license.js). `??` so `license: none` in the
    // vault still beats a license in sites/*.yaml.
    license: bloobSettings.license ?? siteConfig.site?.license,
    footer_searchbar: bloobSettings.footer_searchbar ?? siteConfig.site?.footer_searchbar ?? false,
    // Logo/favicon: wiki-link [[filename]] or plain path; resolved to /media/ URL by assemble-src
    logo: bloobSettings.logo || siteConfig.site?.logo,
    favicon: bloobSettings.favicon || siteConfig.site?.favicon,
    // Background image: wiki-link [[filename]], [alt](path), or plain path; resolved to an
    // optimized /media/optimized/ URL by generate-background.js (see assemble-src.js).
    background_image: bloobSettings.background_image || siteConfig.site?.background_image,
  };

  // Theme. THEME_OVERRIDE (set only by the leons preview workflow) wins over the vault, so a pull
  // request can preview a new theme without changing the live site's settings.
  if (bloobSettings.theme) {
    merged.theme = bloobSettings.theme;
  }
  if (process.env.THEME_OVERRIDE) {
    merged.theme = process.env.THEME_OVERRIDE;
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

  // Visitor counter. Opt-in (default off) and TWO things must be true for a number to
  // appear: this setting, and "allow using the visitor counter" in the GoatCounter site
  // settings, which also defaults to off. Without the second, the counter endpoint
  // answers 403 and the widget stays hidden.
  merged.analytics = {
    ...siteConfig.analytics,
    goatcounter_code:
      parseGoatCounterCode(merged.embeds) || siteConfig.analytics?.goatcounter_code || null,
    show_visitor_count:
      bloobSettings.show_visitor_count ?? siteConfig.analytics?.show_visitor_count ?? false,
  };

  // What AIs may do (SET7, scripts/utils/ai-access.js). Each door only overrides the switches it
  // writes, and the vault wins. Defaults are filled in when site.js is written (assemble-src.js).
  if (bloobSettings.ai !== undefined && bloobSettings.ai !== null) {
    const fromConfig = parseAiSwitches(siteConfig.ai);
    const fromVault = parseAiSwitches(bloobSettings.ai);
    for (const warning of [...fromConfig.warnings, ...fromVault.warnings]) console.warn(`[bloob-settings] ${warning}`);
    merged.ai = { ...fromConfig.switches, ...fromVault.switches };
  }

  // Folders whose pages are always unlisted (scripts/utils/unlisted-folders.js). Owned by the
  // vault: _bloob-settings.md wins over sites/*.yaml.
  merged.unlisted_folders = normalizeUnlistedFolders(
    bloobSettings.unlisted_folders ?? siteConfig.unlisted_folders,
  );

  // Theme-specific settings — opaque bag passed through to site.theme_settings in templates
  if (bloobSettings.theme_settings) {
    merged.theme_settings = {
      ...siteConfig.theme_settings,
      ...bloobSettings.theme_settings,
    };
  }

  // Consolidated URL contract (see docs/architecture/urls-and-ids.md). Single declarative
  // source of truth for how URLs are built. Maps onto the existing config shape so the rest
  // of the pipeline is unchanged. Wins over the legacy flat keys handled above.
  if (bloobSettings.url && typeof bloobSettings.url === "object") {
    const u = bloobSettings.url;

    // base → site.url (supports subdomain or custom domain)
    if (u.base) {
      merged.site = { ...merged.site, url: u.base };
    }

    // case → permalinks.strategy ("lower" → slugify, "preserve" → preserve-case;
    // raw strategy names pass through for flexibility)
    if (u.case) {
      const strategy =
        u.case === "lower" ? "slugify" : u.case === "preserve" ? "preserve-case" : u.case;
      merged.permalinks = { ...merged.permalinks, strategy };
    }

    // date_prefix → date_from_filename / date_prefix_slugs feature flags, read back
    // through resolveDatePrefixMode() in date-prefix.js:
    //   keep  = date stays in the URL       (date_from_filename, no strip)
    //   strip = date removed from the URL   (date_prefix_slugs)
    //   none  = legacy name for strip: Eleventy always stripped the date for it
    // Either way the filename date fills a missing date_created (universal).
    if (u.date_prefix) {
      const keep = u.date_prefix === "keep";
      merged.features = {
        ...merged.features,
        date_from_filename: keep,
        date_prefix_slugs: !keep,
      };
    }

    // date_redirect → features.date_redirects (on unless explicitly off): the other
    // form of a date-prefixed URL redirects to the real one. See date-redirects.js.
    if (u.date_redirect !== undefined && u.date_redirect !== null) {
      const off = u.date_redirect === false || ["no", "off", "false"].includes(String(u.date_redirect).toLowerCase());
      merged.features = { ...merged.features, date_redirects: !off };
    }

    // mount_path → subpath mount (empty string means "no mount")
    if (u.mount_path !== undefined && u.mount_path !== "") {
      merged.mount_path = u.mount_path;
    }
  }

  return merged;
}
