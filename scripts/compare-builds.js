/**
 * Compare two built sites (`_site` copies) page by page.
 *
 *   node scripts/compare-builds.js --before=<dir> --after=<dir>
 *
 * Prints, per .html file: "BODY CHANGED" if anything between <body> tags differs, and the
 * <head> SEO tags (title, meta, canonical) that were added or removed. sitemap.xml and
 * robots.txt are compared as whole text. Files present on only one side are listed.
 * Always exits 0 — it reports, the reader judges.
 */
import fs from "fs";
import path from "path";
import { splitHtml } from "./utils/html-parts.js";
import { isMainModule } from "./utils/is-main.js";

const WHOLE_TEXT = new Set(["sitemap.xml", "robots.txt", "_headers"]);

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.name.endsWith(".html") || WHOLE_TEXT.has(entry.name)) out.push(path.relative(base, full));
  }
  return out;
}

export function compareBuilds(beforeDir, afterDir) {
  const before = new Set(walk(beforeDir));
  const after = new Set(walk(afterDir));
  const lines = [];
  const counts = { pages: 0, bodyChanged: 0, headChanged: 0 };

  for (const file of [...before].sort()) {
    if (!after.has(file)) { lines.push(`ONLY BEFORE  ${file}`); continue; }
    const a = fs.readFileSync(path.join(beforeDir, file), "utf-8");
    const b = fs.readFileSync(path.join(afterDir, file), "utf-8");
    if (WHOLE_TEXT.has(path.basename(file))) {
      if (a !== b) lines.push(`TEXT CHANGED ${file}`);
      continue;
    }
    counts.pages++;
    const pa = splitHtml(a);
    const pb = splitHtml(b);
    const out = [];
    if (pa.body !== pb.body) { out.push("  BODY CHANGED"); counts.bodyChanged++; }
    const removed = pa.headTags.filter((t) => !pb.headTags.includes(t));
    const added = pb.headTags.filter((t) => !pa.headTags.includes(t));
    removed.forEach((t) => out.push(`  - ${t}`));
    added.forEach((t) => out.push(`  + ${t}`));
    if (removed.length || added.length) counts.headChanged++;
    if (out.length) lines.push(file, ...out);
  }
  for (const file of [...after].sort()) if (!before.has(file)) lines.push(`ONLY AFTER   ${file}`);
  return { lines, counts };
}

if (isMainModule(import.meta.url)) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const beforeDir = arg("before");
  const afterDir = arg("after");
  if (!beforeDir || !afterDir) {
    console.error("Usage: node scripts/compare-builds.js --before=<dir> --after=<dir>");
    process.exit(1);
  }
  const { lines, counts } = compareBuilds(beforeDir, afterDir);
  console.log(lines.join("\n"));
  console.log(`\n${counts.pages} pages compared · ${counts.bodyChanged} body changed · ${counts.headChanged} head changed`);
}
