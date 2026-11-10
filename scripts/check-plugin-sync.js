/**
 * Check that the Obsidian plugin's "Copy link" builds the same URL as this builder.
 *
 * The plugin (`../bloob-haus-obsidian-plugin/modules/bloob-url-core.ts`) mirrors the
 * builder's URL logic (slug strategies, date prefix, folder indexes, the `url:` block).
 * Whenever that logic changes here, run this — a mismatch means a copied link 404s.
 *
 * Runs a grid of tricky filenames × every `url.case` / `url.date_prefix` combination
 * through both and prints every disagreement. Not part of `npm test`: the plugin is a
 * sibling repo that CI does not have.
 *
 * Usage:
 *   node scripts/check-plugin-sync.js [--plugin=../bloob-haus-obsidian-plugin]
 * Needs a Node that runs TypeScript directly (22.18+ / 23.6+).
 */
import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { isMainModule } from "./utils/is-main.js";
import { buildFileIndex } from "./utils/file-index-builder.js";
import { mergeBloobSettings } from "./utils/bloob-settings-reader.js";
import { resolveDatePrefixMode } from "./utils/date-prefix.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const NAMES = [
  "tender-fleck/sets/2026-11-07 Aden Bday Dolores Park Set.md",
  "2026-11-07-Aden-Bday.md",
  "2026-11-07  Two Spaces.md",
  "2026-13-01 Bad Month.md",
  "2026-11-07.md",
  "2026-11-07--Double.md",
  "2025-10-10-Journal/Entry.md",
  "2025-10-10-Journal/2025-10-11 Day Two.md",
  "Recipes/Mom's Cake (Triple Batch).md",
  "Café Notes/Über ça.md",
  "Resources/_index.md",
  "index.md",
  "Deep/Folder Name/2026-01-05 x.y z.md",
  "still-tweaking/2026-08-09 Cake for fruits - triple batch.md",
];

export async function checkPluginSync(pluginDir) {
  const corePath = path.join(pluginDir, "modules", "bloob-url-core.ts");
  const plugin = await import(pathToFileURL(corePath).href);

  const mismatches = [];
  let checks = 0;
  for (const urlCase of ["preserve", "lower"]) {
    for (const datePrefix of ["keep", "strip", "none", undefined]) {
      const vault = { url: { base: "https://x.bloob.haus", case: urlCase, ...(datePrefix ? { date_prefix: datePrefix } : {}) } };
      const config = mergeBloobSettings({}, vault);
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-sync-"));
      try {
        const files = [];
        for (const name of NAMES) {
          const p = path.join(dir, name);
          await fs.outputFile(p, "---\n---\nx");
          files.push({ path: p, relativePath: name });
        }
        const index = await buildFileIndex(files, dir, {
          slugStrategy: config.permalinks?.strategy || "preserve-case",
          stripDatePrefix: resolveDatePrefixMode(config.features) === "strip",
        });
        const pluginSettings = plugin.parseUrlSettings(vault);
        for (const page of Object.values(index.pages)) {
          checks++;
          const pluginUrl = plugin.buildUrlPath(page.relativePath, pluginSettings);
          if (pluginUrl !== page.url) {
            mismatches.push({ settings: vault.url, file: page.relativePath, builder: page.url, plugin: pluginUrl });
          }
        }
      } finally {
        await fs.remove(dir);
      }
    }
  }
  return { checks, mismatches };
}

if (isMainModule(import.meta.url)) {
  const arg = process.argv.find((a) => a.startsWith("--plugin="));
  const pluginDir = path.resolve(ROOT_DIR, arg ? arg.slice(9) : "../bloob-haus-obsidian-plugin");
  if (!(await fs.pathExists(pluginDir))) {
    console.error(`Plugin repo not found at ${pluginDir} — pass --plugin=<path>.`);
    process.exit(1);
  }
  const { checks, mismatches } = await checkPluginSync(pluginDir);
  for (const m of mismatches) {
    console.log(`MISMATCH ${JSON.stringify(m.settings)} ${m.file}\n  builder ${m.builder}\n  plugin  ${m.plugin}`);
  }
  console.log(`\n${checks} URLs compared, ${mismatches.length} mismatch(es).`);
  process.exit(mismatches.length ? 1 : 0);
}
