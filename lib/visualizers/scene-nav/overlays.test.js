import { describe, it, expect } from "vitest";
import { resolveOverlay, colorLuminance, OVERLAYS, OVERLAY_BASE } from "./overlays.js";

describe("colorLuminance", () => {
  it("is ~1 for white, ~0 for black", () => {
    expect(colorLuminance("#ffffff")).toBeCloseTo(1, 2);
    expect(colorLuminance("white")).toBeCloseTo(1, 2);
    expect(colorLuminance("#000000")).toBeCloseTo(0, 2);
  });
  it("treats dark greys / greens / blues as dark (< 0.5)", () => {
    expect(colorLuminance("#3f3f3f")).toBeLessThan(0.5);
    expect(colorLuminance("dark grey")).toBeLessThan(0.5);
    expect(colorLuminance("#2e7d32")).toBeLessThan(0.5); // green
    expect(colorLuminance("#1565c0")).toBeLessThan(0.5); // blue
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
  it("default (no color) → bright path: black-bg loop, bg multiply, mix screen", () => {
    const o = resolveOverlay("water");
    expect(o.url).toBe(`${OVERLAY_BASE}/water.gif`);
    expect(o.bgBlend).toBe("multiply");
    expect(o.blend).toBe("screen");
    expect(o.opacity).toBe(0.7);
  });

  it("a DARK color → dark path: white-bg loop, bg screen, mix multiply, exact tint kept", () => {
    const o = resolveOverlay("water", { color: "#2e7d32" });
    expect(o.url).toBe(`${OVERLAY_BASE}/water-light.gif`);
    expect(o.bgBlend).toBe("screen");
    expect(o.blend).toBe("multiply");
    expect(o.color).toBe("#2e7d32");
  });

  it("a LIGHT color stays on the bright path", () => {
    const o = resolveOverlay("water", { color: "#ffffff" });
    expect(o.url).toBe(`${OVERLAY_BASE}/water.gif`);
    expect(o.bgBlend).toBe("multiply");
    expect(o.blend).toBe("screen");
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

  it("every registry entry carries both loop variants + label + opacity", () => {
    for (const [id, e] of Object.entries(OVERLAYS)) {
      expect(e.file, id).toBeTruthy();
      expect(e.fileLight, id).toBeTruthy();
      expect(e.label, id).toBeTruthy();
      expect(typeof e.opacity, id).toBe("number");
    }
  });
});
