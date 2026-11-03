import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
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
    // Run the bundler fresh into a temp dir: src/_data/visualizers.json is a build artifact
    // whose age depends on the last local build, so reading it tested a stale file.
    const tmp = mkdtempSync(path.join(os.tmpdir(), "viz-discovery-"));
    let raw;
    try {
      execFileSync(process.execPath, ["scripts/bundle-visualizers.js"], {
        cwd: ROOT,
        env: { ...process.env, SRC_DIR: tmp },
        stdio: "ignore",
      });
      raw = JSON.parse(readFileSync(path.join(tmp, "_data/visualizers.json"), "utf-8"));
    } finally {
      rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
    }
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
