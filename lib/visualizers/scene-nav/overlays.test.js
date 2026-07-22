import { describe, it, expect } from "vitest";
import { resolveOverlay, colorLuminance, OVERLAYS, OVERLAY_BASE } from "./overlays.js";

describe("colorLuminance", () => {
  it("is ~1 for white, ~0 for black", () => {
    expect(colorLuminance("#ffffff")).toBeCloseTo(1, 2);
    expect(colorLuminance("white")).toBeCloseTo(1, 2);
    expect(colorLuminance("#000000")).toBeCloseTo(0, 2);
  });
  it("treats dark greys as dark (< 0.5)", () => {
    expect(colorLuminance("#3f3f3f")).toBeLessThan(0.5);
    expect(colorLuminance("dark grey")).toBeLessThan(0.5);
    expect(colorLuminance("rgb(40,40,40)")).toBeLessThan(0.5);
  });
  it("parses 3-digit hex", () => {
    expect(colorLuminance("#fff")).toBeCloseTo(1, 2);
    expect(colorLuminance("#000")).toBeCloseTo(0, 2);
  });
  it("defaults unknown/empty to light (1) so it keeps the bright default", () => {
    expect(colorLuminance("")).toBe(1);
    expect(colorLuminance("not-a-color")).toBe(1);
    expect(colorLuminance(null)).toBe(1);
  });
});

describe("resolveOverlay", () => {
  it("defaults (no color) to bright: screen, no invert, registry opacity", () => {
    const o = resolveOverlay("water");
    expect(o.url).toBe(`${OVERLAY_BASE}/water.gif`);
    expect(o.blend).toBe("screen");
    expect(o.filter).toBe("none");
    expect(o.opacity).toBe(0.7);
  });

  it("a DARK color inverts to dark caustics: invert(1) + multiply", () => {
    const o = resolveOverlay("water", { color: "#3f3f3f" });
    expect(o.blend).toBe("multiply");
    expect(o.filter).toBe("invert(1)");
    expect(o.color).toBe("#3f3f3f");
  });

  it("a LIGHT color stays bright: screen + no invert", () => {
    const o = resolveOverlay("water", { color: "#ffffff" });
    expect(o.blend).toBe("screen");
    expect(o.filter).toBe("none");
  });

  it("strength overrides opacity (clamped 0..1)", () => {
    expect(resolveOverlay("water", { strength: 0.35 }).opacity).toBe(0.35);
    expect(resolveOverlay("water", { strength: 5 }).opacity).toBe(1);
    expect(resolveOverlay("water", { strength: -1 }).opacity).toBe(0);
  });

  it("is case-insensitive and returns null for empty/unknown ids", () => {
    expect(resolveOverlay("  WATER ").url).toBe(`${OVERLAY_BASE}/water.gif`);
    expect(resolveOverlay(null)).toBeNull();
    expect(resolveOverlay("")).toBeNull();
    expect(resolveOverlay("nope")).toBeNull();
  });

  it("every registry entry has a file, label and opacity", () => {
    for (const [id, e] of Object.entries(OVERLAYS)) {
      expect(e.file, id).toBeTruthy();
      expect(e.label, id).toBeTruthy();
      expect(typeof e.opacity, id).toBe("number");
    }
  });
});
