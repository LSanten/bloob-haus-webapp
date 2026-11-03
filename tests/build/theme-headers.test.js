/**
 * Cloudflare Pages reads one `_headers` file. Two sources can contribute rules: a theme's own
 * `themes/<theme>/_headers` (e.g. alter-engineers: noindex on *.pages.dev and /clients/*) and
 * `lib/magic-machines/_headers` (COOP/COEP). assemble-src composes them into `<src>/_headers`;
 * build-site step 7.1 may append the show_in_search: no rule afterwards.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { writeComposedHeaders } from "../../scripts/assemble-src.js";

let dir;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), "theme-headers-")); });
afterEach(async () => { await fs.remove(dir); });

const MAGIC = "/magic-machine/*\n  Cross-Origin-Opener-Policy: same-origin\n";
const THEME = "/clients/*\n  X-Robots-Tag: noindex\n";

async function setup({ theme, magic }) {
  const themeFile = path.join(dir, "theme/_headers");
  const magicFile = path.join(dir, "lib/_headers");
  if (theme) await fs.outputFile(themeFile, theme);
  if (magic) await fs.outputFile(magicFile, magic);
  return { themeFile, magicFile, srcDir: path.join(dir, "src") };
}

describe("writeComposedHeaders", () => {
  it("writes nothing when neither source exists", async () => {
    const { themeFile, magicFile, srcDir } = await setup({});
    await writeComposedHeaders({ themeFile, magicFile, magicEnabled: true, srcDir });
    expect(await fs.pathExists(path.join(srcDir, "_headers"))).toBe(false);
  });

  it("copies the magic-machines rules byte for byte when the theme has none", async () => {
    const { themeFile, magicFile, srcDir } = await setup({ magic: MAGIC });
    await writeComposedHeaders({ themeFile, magicFile, magicEnabled: true, srcDir });
    expect(await fs.readFile(path.join(srcDir, "_headers"), "utf-8")).toBe(MAGIC);
  });

  it("keeps both theme and magic-machines rules", async () => {
    const { themeFile, magicFile, srcDir } = await setup({ theme: THEME, magic: MAGIC });
    await writeComposedHeaders({ themeFile, magicFile, magicEnabled: true, srcDir });
    const text = await fs.readFile(path.join(srcDir, "_headers"), "utf-8");
    expect(text).toContain(THEME);
    expect(text).toContain(MAGIC);
  });

  it("leaves out the magic-machines rules when magic machines are off", async () => {
    const { themeFile, magicFile, srcDir } = await setup({ theme: THEME, magic: MAGIC });
    await writeComposedHeaders({ themeFile, magicFile, magicEnabled: false, srcDir });
    expect(await fs.readFile(path.join(srcDir, "_headers"), "utf-8")).toBe(THEME);
  });

  it("removes a stale composed file when no source remains", async () => {
    const { themeFile, magicFile, srcDir } = await setup({});
    await fs.outputFile(path.join(srcDir, "_headers"), "stale");
    await writeComposedHeaders({ themeFile, magicFile, magicEnabled: true, srcDir });
    expect(await fs.pathExists(path.join(srcDir, "_headers"))).toBe(false);
  });
});
