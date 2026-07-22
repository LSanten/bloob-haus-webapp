import { describe, it, expect } from "vitest";
import { resolveOverlay, OVERLAYS, OVERLAY_BASE } from "./overlays.js";

describe("resolveOverlay", () => {
  it("resolves a known id to render params", () => {
    const o = resolveOverlay("water");
    expect(o).not.toBeNull();
    expect(o.id).toBe("water");
    expect(o.url).toBe(`${OVERLAY_BASE}/water.gif`);
    expect(o.blend).toBe("screen");
    expect(typeof o.opacity).toBe("number");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveOverlay("  WATER ").url).toBe(`${OVERLAY_BASE}/water.gif`);
  });

  it("returns null for empty / unknown ids", () => {
    expect(resolveOverlay(null)).toBeNull();
    expect(resolveOverlay(undefined)).toBeNull();
    expect(resolveOverlay("")).toBeNull();
    expect(resolveOverlay("nope")).toBeNull();
  });

  it("every registry entry has a file, label, opacity and blend", () => {
    for (const [id, e] of Object.entries(OVERLAYS)) {
      expect(e.file, id).toBeTruthy();
      expect(e.label, id).toBeTruthy();
      expect(typeof e.opacity, id).toBe("number");
      expect(e.blend, id).toBeTruthy();
    }
  });
});
