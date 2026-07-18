#!/usr/bin/env node
/**
 * migrate-bloob-type-to-shape.js
 *
 * Content migration: rewrites the legacy identity frontmatter keys `bloob-type:` and
 * `bloob-object:` to the forward-facing `bloob-shape:` key, in the FIRST frontmatter
 * block of every note in a content vault.
 *
 * - Registry/settings files (`_bloob-*.md`) are skipped — they carry their own column schema.
 * - Body text is never touched — only the frontmatter region between the opening `---`
 *   and the next `---`.
 * - At most one identity key per note is rewritten (they are mutually exclusive in practice).
 *
 * Safe to run repeatedly (idempotent). Dry-run by default; pass --apply to write.
 *
 * Usage:
 *   node scripts/migrate-bloob-type-to-shape.js --content=/path/to/vault            # dry-run
 *   node scripts/migrate-bloob-type-to-shape.js --content=/path/to/vault --apply     # write
 *
 * Cross-platform: path.join, fs, no inline env, no shell.
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { content: null, apply: false };
  for (const a of argv.slice(2)) {
    if (a === "--apply") args.apply = true;
    else if (a.startsWith("--content=")) args.content = a.slice("--content=".length);
  }
  return args;
}

function walkMarkdown(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // skip .git, .obsidian, etc.
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_bloob-")) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Rewrites bloob-type/bloob-object -> bloob-shape within the first frontmatter block only.
 * @returns {{changed: boolean, content: string, from?: string, to?: string}}
 */
export function rewriteFrontmatter(raw) {
  const lines = raw.split("\n");
  if (lines[0] !== "---") return { changed: false, content: raw };

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { end = i; break; }
  }
  if (end === -1) return { changed: false, content: raw };

  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^(bloob-type|bloob-object):(.*)$/);
    if (m) {
      const from = lines[i];
      lines[i] = `bloob-shape:${m[2]}`;
      return { changed: true, content: lines.join("\n"), from, to: lines[i] };
    }
  }
  return { changed: false, content: raw };
}

function main() {
  const { content, apply } = parseArgs(process.argv);
  if (!content) {
    console.error("Error: --content=<vault dir> is required");
    process.exit(1);
  }
  const root = path.resolve(content);
  if (!fs.existsSync(root)) {
    console.error(`Error: content dir not found: ${root}`);
    process.exit(1);
  }

  const files = walkMarkdown(root);
  const changes = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const res = rewriteFrontmatter(raw);
    if (res.changed) {
      changes.push({ file, from: res.from, to: res.to });
      if (apply) fs.writeFileSync(file, res.content, "utf8");
    }
  }

  const mode = apply ? "APPLIED" : "DRY-RUN (no files written)";
  console.log(`\nbloob-type / bloob-object  ->  bloob-shape   [${mode}]`);
  console.log(`vault: ${root}`);
  console.log(`files changed: ${changes.length}\n`);
  for (const c of changes) {
    console.log(`  ${path.relative(root, c.file)}`);
    console.log(`     -  ${c.from}`);
    console.log(`     +  ${c.to}`);
  }
  if (!apply && changes.length) console.log(`\nRe-run with --apply to write these changes.`);
}

main();
