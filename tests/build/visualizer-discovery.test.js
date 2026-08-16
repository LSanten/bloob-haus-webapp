import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VISUALIZERS_DIR = path.join(ROOT, "lib/visualizers");

/**
 * `lib/visualizers/_utils/` holds pure helpers shared by several shapes — it is a folder of
 * functions, not a visualizer. The leading underscore is the convention that says so, matching
 * the `_bloob-*` system-file convention used in vaults.
 *
 * Before 2026-08-16 the bundler enumerated it as a shape, so it landed in visualizers.json as a
 * manifest-less entry — and per docs/architecture/visualizers.md, "a shape with no `detect` block
 * is always loaded". A phantom always-loaded shape also skews the detection audit.
 */
describe("visualizer auto-discovery skips underscore-prefixed folders", () => {
  it("_utils exists and is underscore-prefixed", () => {
    expect(existsSync(path.join(VISUALIZERS_DIR, "_utils"))).toBe(true);
  });

  it("no underscore-prefixed folder appears in the generated manifest", () => {
    const manifestPath = path.join(ROOT, "src/_data/visualizers.json");
    if (!existsSync(manifestPath)) return; // manifest is a build artifact; skip if absent
    const raw = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const names = Array.isArray(raw) ? raw.map((v) => v.name ?? v) : Object.keys(raw);
    const underscored = names.filter((n) => String(n).startsWith("_"));
    expect(underscored).toEqual([]);
  });

  // A shape without a manifest.json is treated as "always loaded" (visualizers.md →
  // "Per-page asset loading"), so it silently opts out of per-page asset loading. This is
  // pinned rather than asserted-empty: `ken-burns-zoom` is a real, pre-existing gap tracked
  // in TECH-DEBT. The point of the test is that a NEW one fails here.
  it("no shape is missing its manifest.json beyond the known gap", () => {
    const dirs = readdirSync(VISUALIZERS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    const missing = dirs.filter(
      (d) => !existsSync(path.join(VISUALIZERS_DIR, d, "manifest.json")),
    );
    expect(missing).toEqual(["ken-burns-zoom"]);
  });
});
