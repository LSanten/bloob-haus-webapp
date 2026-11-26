import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { publishPages } from "../../scripts/build-visualizer-editor.js";

// A one-page visualizer (rung 0, docs/architecture/making-visualizers.md) is one HTML file. The
// visualizers site publishes it as it is, at bloob.haus/visualizers/<name>/.
let out, published;
beforeAll(async () => { out = await fs.mkdtemp(path.join(os.tmpdir(), "pages-")); published = await publishPages(out); });
afterAll(() => fs.remove(out));

describe("publishing one-page visualizers", () => {
  it("puts each one at its own address", async () => {
    expect(published).toContain("cells");
    const html = await fs.readFile(path.join(out, "cells", "index.html"), "utf-8");
    expect(html).toContain("<title>Cells");
  });
  it("its writing card travels with it", async () => {
    expect(await fs.readFile(path.join(out, "cells", "schema.md"), "utf-8")).toContain("bloob-note");
  });
  it("publishes only one-page visualizers", async () => {
    expect(published).not.toContain("note");
    expect(await fs.pathExists(path.join(out, "note", "index.html"))).toBe(false);
  });
});
