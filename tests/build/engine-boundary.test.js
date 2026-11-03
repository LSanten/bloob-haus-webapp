/**
 * The engine and the visualizers built on it import nothing outside their own family, so they
 * run in every host (site builder, editor, post office, any page) and can be lifted out whole.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VIS = path.join(ROOT, "lib/visualizers");
const FAMILY = ["_engine", "note", "marble"].map((d) => path.join(VIS, d));
// The article joins the family once it has JavaScript of its own (plan Task 8).
if (existsSync(path.join(VIS, "article/render.js"))) FAMILY.push(path.join(VIS, "article"));

function jsFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return jsFiles(full);
    return name.endsWith(".js") && !name.endsWith(".test.js") ? [full] : [];
  });
}

export function importsOf(source) {
  const specs = [];
  for (const m of source.matchAll(/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']/g)) specs.push(m[1]);
  for (const m of source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.push(m[1]);
  for (const m of source.matchAll(/^\s*import\s*["']([^"']+)["']/gm)) specs.push(m[1]);
  return specs;
}

export function resolvesInsideFamily(file, spec, family = FAMILY) {
  if (!spec.startsWith(".")) return false; // bare names and node: built-ins (fs, path) are out
  const target = path.resolve(path.dirname(file), spec);
  return family.some((dir) => target === dir || target.startsWith(dir + path.sep));
}

const files = FAMILY.flatMap(jsFiles);

describe("engine family imports", () => {
  it("finds the engine's files", () => expect(files.length).toBeGreaterThan(0));

  it.each(files.map((f) => [path.relative(ROOT, f), f]))("%s imports only inside the family", (_, file) => {
    for (const spec of importsOf(readFileSync(file, "utf-8"))) {
      expect(resolvesInsideFamily(file, spec), `${spec}`).toBe(true);
    }
  });

  it("would catch a file-system import", () => {
    const file = path.join(VIS, "_engine/x.js");
    expect(importsOf('import fs from "fs";').every((s) => resolvesInsideFamily(file, s))).toBe(false);
    expect(resolvesInsideFamily(file, "../../../scripts/utils/x.js")).toBe(false);
    expect(resolvesInsideFamily(file, "./fill.js")).toBe(true);
  });
});
