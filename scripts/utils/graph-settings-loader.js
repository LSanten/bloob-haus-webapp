/**
 * Graph Settings Loader
 * Reads .bloob/graph.yaml from the content vault and merges with defaults.
 * Written to src/graph-settings.json by the preprocessor so browser.js
 * can fetch it at runtime without needing a build step.
 */

import fs from "fs-extra";
import path from "path";
import jsYaml from "js-yaml";

/**
 * Default settings — matches manifest.json defaults.
 * These apply when no .bloob/graph.yaml exists in the vault.
 */
export const GRAPH_DEFAULTS = {
  only_if_linked: true,
  depth: 2,
  show_full_graph: true,
  colors: {},
};

/**
 * Loads graph settings from .bloob/graph.yaml in the content vault.
 * Falls back to GRAPH_DEFAULTS if the file doesn't exist or can't be parsed.
 *
 * @param {string} contentDir - Path to the cloned content directory
 * @returns {Object} Merged settings object
 */
export async function loadGraphSettings(contentDir) {
  const settingsPath = path.join(contentDir, ".bloob", "graph.yaml");

  if (!(await fs.pathExists(settingsPath))) {
    return { ...GRAPH_DEFAULTS };
  }

  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    const parsed = jsYaml.load(raw) || {};
    return {
      ...GRAPH_DEFAULTS,
      ...parsed,
      // Deep merge colors so partial overrides work
      colors: { ...(GRAPH_DEFAULTS.colors || {}), ...(parsed.colors || {}) },
    };
  } catch (e) {
    console.warn(
      `[graph] Failed to parse .bloob/graph.yaml: ${e.message} — using defaults`,
    );
    return { ...GRAPH_DEFAULTS };
  }
}
