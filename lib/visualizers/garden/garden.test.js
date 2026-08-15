import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GROUND_TYPES } from "./parser.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const styles = fs.readFileSync(path.join(here, "styles.css"), "utf-8");
const schema = fs.readFileSync(path.join(here, "schema.md"), "utf-8");

/**
 * The ground vocabulary is shared by BOTH faces of the shape: the renderer
 * styles it in styles.css, the builder offers it as a swatch and paints it on
 * canvas. When the two lists drift, a legal fence silently renders differently
 * in each — which is exactly what happened with `soil` (renderer had a
 * `--soil` rule, the builder's own list had only four textures, so the fence
 * fell through to dirt's colour). parser.js owns the list; everything else
 * derives from it.
 */
describe("garden ground vocabulary", () => {
  const styledTokens = [
    ...new Set(
      [...styles.matchAll(/\.garden-ground--([a-z0-9-]+)/g)].map((m) => m[1])
    ),
  ];

  it("declares the ground tokens as a shared, non-empty vocabulary", () => {
    expect(Array.isArray(GROUND_TYPES)).toBe(true);
    expect(GROUND_TYPES.length).toBeGreaterThan(0);
  });

  it("includes soil — a plain-brown ground with no texture", () => {
    expect(GROUND_TYPES).toContain("soil");
  });

  it.each(GROUND_TYPES ?? [])("renderer styles the %s ground", (token) => {
    expect(styledTokens).toContain(token);
  });

  it("styles no ground token that is not in the shared vocabulary", () => {
    expect(styledTokens.sort()).toEqual([...GROUND_TYPES].sort());
  });

  it.each(GROUND_TYPES ?? [])("schema.md documents the %s ground", (token) => {
    expect(schema).toContain(token);
  });
});
