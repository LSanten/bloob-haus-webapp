import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GROUND_TYPES, parseGarden, serializeGarden } from "./parser.js";

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

/**
 * TECH-DEBT #46. The attribute tokenizer split on /\s+/ with no quote awareness, so any
 * value containing a space was truncated at the first one and its tail became a bare flag.
 * That broke `src:` for real filenames AND corrupted garden's own round-trip: serializeGarden
 * writes `bg:"my backdrop.png"`, which parseGarden read back as `"my`.
 *
 * Contract (shapes.md → "Authoring & resolution conventions" #4): refs are STORED decoded
 * and EMITTED encoded.
 */
describe("attribute values containing spaces (TECH-DEBT #46)", () => {
  it("parses a quoted src with spaces", () => {
    const m = parseGarden('- flower "Rose" @10,20 src:"Contact us.png"');
    expect(m.elements[0].src).toBe("Contact us.png");
  });

  it("does not leak the value tail into flags", () => {
    const m = parseGarden('- flower "Rose" @10,20 src:"Contact us.png" glow:#fff');
    expect(m.elements[0].src).toBe("Contact us.png");
    expect(m.elements[0].glow).toBe("#fff");
  });

  it("decodes a percent-encoded src so the model holds the real filename", () => {
    const m = parseGarden("- flower \"Rose\" @10,20 src:Contact%20us.png");
    expect(m.elements[0].src).toBe("Contact us.png");
  });

  it("survives a literal % in a filename without throwing", () => {
    expect(() => parseGarden('- flower "R" @1,2 src:"50% off flyer.png"')).not.toThrow();
    expect(parseGarden('- flower "R" @1,2 src:"50% off flyer.png"').elements[0].src)
      .toBe("50% off flyer.png");
  });

  it("parses a quoted page bg with spaces", () => {
    const m = parseGarden('- flower "Iris" @1,2\n\t- page: bg:"my backdrop.png" font:georgia');
    expect(m.elements[0].pageSettings.bg).toBe("my backdrop.png");
    expect(m.elements[0].pageSettings.font).toBe("georgia");
  });

  it("still parses an unquoted value with no spaces", () => {
    const m = parseGarden("- flower \"Rose\" @10,20 src:media/garden/rose.png hover:bounce");
    expect(m.elements[0].src).toBe("media/garden/rose.png");
    expect(m.elements[0].hover).toBe("bounce");
  });

  it("still parses bare flags", () => {
    const m = parseGarden('- label "Hi" @1,2 bold italic');
    expect(m.elements[0].bold).toBe(true);
    expect(m.elements[0].italic).toBe(true);
  });

  it("round-trips a src containing spaces", () => {
    const src = '- flower "Rose" @10,20 src:"Contact us.png"';
    const once = serializeGarden(parseGarden(src));
    expect(parseGarden(once).elements[0].src).toBe("Contact us.png");
    expect(serializeGarden(parseGarden(once))).toBe(once);
  });

  it("round-trips a page bg containing spaces", () => {
    const src = '- flower "Iris" @1,2\n\t- page: bg:"my backdrop.png"';
    const once = serializeGarden(parseGarden(src));
    expect(parseGarden(once).elements[0].pageSettings.bg).toBe("my backdrop.png");
    expect(serializeGarden(parseGarden(once))).toBe(once);
  });
});

describe("unquoted spaces are reported, never silent", () => {
  it("warns when an attribute value was truncated by an unquoted space", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseGarden('- custom "Sketch" @30,40 src:media/garden/my sketch.png');
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.flat().join(" ")).toContain("sketch.png");
    warn.mockRestore();
  });

  it("does not warn for the three real flags", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseGarden('- label "Hi" @1,2 bold italic highlight');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn for a correctly quoted value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parseGarden('- custom "Sketch" @30,40 src:"media/garden/my sketch.png"');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
