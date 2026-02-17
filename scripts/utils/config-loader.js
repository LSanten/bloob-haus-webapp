/**
 * Config Loader
 * Loads site configuration from sites/{name}.yaml
 * Shared by assemble-src.js, build-site.js, and eleventy.config.js
 */

import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

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
 * Loads site configuration from sites/{name}.yaml
 * @param {string} siteName - Site name (matches filename in sites/)
 * @returns {object} Parsed site configuration
 */
export async function loadSiteConfig(siteName) {
  const configPath = path.join(ROOT_DIR, "sites", `${siteName}.yaml`);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Site config not found: ${configPath}\nAvailable sites: ${listAvailableSites().join(", ")}`,
    );
  }

  const raw = await fs.readFile(configPath, "utf-8");
  const config = yaml.load(raw);

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
