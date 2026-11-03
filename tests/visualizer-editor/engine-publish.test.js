import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { publishEngine } from "../../scripts/build-visualizer-editor.js";
import { VERSION } from "../../lib/visualizers/_engine/version.js";

let out;
beforeAll(async () => { out = await fs.mkdtemp(path.join(os.tmpdir(), "engine-")); await publishEngine(out); });
afterAll(() => fs.remove(out));

describe("publishing the engine", () => {
  it("writes the engine under its version and under stable, identical", async () => {
    const versioned = await fs.readFile(path.join(out, "engine", VERSION, "bloob-engine.js"), "utf-8");
    const stable = await fs.readFile(path.join(out, "engine", "stable", "bloob-engine.js"), "utf-8");
    expect(versioned.length).toBeGreaterThan(1000);
    expect(stable).toBe(versioned);
    expect(versioned).toContain("BloobObjects");
  });
  it("its styles travel with it", async () => {
    expect(await fs.readFile(path.join(out, "engine", "stable", "bloob-engine.css"), "utf-8")).toContain(".bloob-object");
  });
});
