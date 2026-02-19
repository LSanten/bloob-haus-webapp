/**
 * Graph Visualizer — Preprocess Hook
 *
 * Auto-discovered by preprocess-content.js at build time.
 * Any visualizer can export preprocessHook({ contentDir, outputDir })
 * and it will be called automatically — no changes to the preprocessor needed.
 *
 * This hook reads .bloob/graph.yaml from the content vault and writes
 * graph-settings.json to the output directory so browser.js can fetch it
 * at /graph-settings.json.
 *
 * Settings precedence (lowest → highest):
 *   GRAPH_DEFAULTS (here) ← .bloob/graph.yaml ← page frontmatter ← code fence
 */

import fs from "fs-extra";
import path from "path";
import jsYaml from "js-yaml";

export const GRAPH_DEFAULTS = {
  only_if_linked: true,
  depth: 2,
  show_full_graph: true,
  show_tags: true,
  colors: {},
};

/**
 * Merges raw parsed YAML with defaults.
 * Pure function — exported so it can be unit-tested without disk I/O.
 *
 * @param {Object} parsed - Parsed contents of .bloob/graph.yaml (may be empty)
 * @returns {Object} Merged settings
 */
export function mergeGraphSettings(parsed = {}) {
  return {
    ...GRAPH_DEFAULTS,
    ...parsed,
    // Deep merge colors so partial overrides work (e.g. just setting node color)
    colors: { ...(GRAPH_DEFAULTS.colors || {}), ...(parsed.colors || {}) },
  };
}

/**
 * Preprocess hook — called automatically by preprocess-content.js.
 * Reads .bloob/graph.yaml from the vault and writes graph-settings.json.
 *
 * @param {Object} options
 * @param {string} options.contentDir - Path to the cloned content vault
 * @param {string} options.outputDir  - Path to the src/ output directory
 */
export async function preprocessHook({ contentDir, outputDir }) {
  const settingsPath = path.join(contentDir, ".bloob", "graph.yaml");

  let parsed = {};
  if (await fs.pathExists(settingsPath)) {
    try {
      const raw = await fs.readFile(settingsPath, "utf-8");
      parsed = jsYaml.load(raw) || {};
    } catch (e) {
      console.warn(
        `[graph] Failed to parse .bloob/graph.yaml: ${e.message} — using defaults`,
      );
    }
  }

  const settings = mergeGraphSettings(parsed);
  await fs.writeJson(path.join(outputDir, "graph-settings.json"), settings, {
    spaces: 2,
  });
  console.log("[graph] Wrote vault settings to graph-settings.json");
}
