/**
 * Config Loader
 * Loads site configuration from sites/{name}.yaml and merges with _bloob-settings.md
 *
 * Source of truth hierarchy:
 * 1. _bloob-settings.md (in content repo) - user-editable site settings
 * 2. sites/{name}.yaml - webapp-specific settings (repo URL, branch, deployed URL)
 *
 * Shared by assemble-src.js, build-site.js, and eleventy.config.js
 */

import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { fileURLToPath } from "url";
import { readBloobSettings, mergeBloobSettings } from "./bloob-settings-reader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

/**
 * Resolves the site name from CLI args or env var.
 * Priority: --site=NAME > SITE_NAME env var > "buffbaby"
 */
export function resolveSiteName() {
  const args = process.argv.slice(2);
  const siteArg = args.find((a) => a.startsWith("--site="));
  if (siteArg) return siteArg.split("=")[1];
  return process.env.SITE_NAME || "buffbaby";
}

/**
 * Loads site configuration from sites/{name}.yaml and merges with _bloob-settings.md
 * @param {string} siteName - Site name (matches filename in sites/)
 * @param {Object} options - Optional configuration
 * @param {string} options.contentDir - Path to content directory (for reading _bloob-settings.md)
 * @param {boolean} options.skipBloobSettings - Skip reading _bloob-settings.md (for initial load before cloning)
 * @returns {object} Merged site configuration
 */
export async function loadSiteConfig(siteName, options = {}) {
  const configPath = path.join(ROOT_DIR, "sites", `${siteName}.yaml`);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Site config not found: ${configPath}\nAvailable sites: ${listAvailableSites().join(", ")}`,
    );
  }

  const raw = await fs.readFile(configPath, "utf-8");
  let config = yaml.load(raw);

  // Skip bloob settings merge if requested (for initial load before content is cloned)
  if (options.skipBloobSettings) {
    return config;
  }

  // Read and merge _bloob-settings.md from content directory
  const contentDir = options.contentDir || path.join(ROOT_DIR, "content-source");
  if (fs.existsSync(contentDir)) {
    const bloobSettings = await readBloobSettings(contentDir);
    if (bloobSettings) {
      config = mergeBloobSettings(config, bloobSettings);
      console.log("[config] Merged settings from _bloob-settings.md");
    }
  }

  return config;
}

/**
 * Lists available site configs in the sites/ directory.
 */
function listAvailableSites() {
  const sitesDir = path.join(ROOT_DIR, "sites");
  if (!fs.existsSync(sitesDir)) return [];
  return fs
    .readdirSync(sitesDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(".yaml", ""));
}

export { ROOT_DIR };
