import { describe, it, expect } from "vitest";
import { degrees, nodeRadius, labelAlpha, fitTransform, ease, toPixiColor } from "./look.js";

describe("graph look", () => {
  it("counts links per node, either end, objects or ids", () => {
    const d = degrees([{ source: "a", target: "b" }, { source: { id: "a" }, target: { id: "c" } }]);
    expect([d.get("a"), d.get("b"), d.get("c")]).toEqual([2, 1, 1]);
  });
  it("grows nodes slowly with their links", () => {
    expect(nodeRadius(0)).toBe(2);
    expect(nodeRadius(4)).toBe(4);
    expect(nodeRadius(16)).toBe(6);
  });
  it("fades labels in with zoom, sooner when asked", () => {
    expect(labelAlpha(1)).toBe(0);
    expect(labelAlpha(1.4)).toBe(0);
    expect(labelAlpha(3)).toBe(1);
    expect(labelAlpha(1, 1.6)).toBeGreaterThan(labelAlpha(1, 1));
  });
  it("fits points into the box, centered, with a zoom cap", () => {
    const t = fitTransform([{ x: -50, y: -10 }, { x: 50, y: 10 }], 300, 200, { pad: 50 });
    expect(t.k).toBeCloseTo(2);
    expect(t.x).toBeCloseTo(150);
    expect(t.y).toBeCloseTo(100);
    expect(fitTransform([{ x: 0, y: 0 }, { x: 1, y: 1 }], 300, 200).k).toBe(2.4);
  });
  it("eases toward a target and stops", () => {
    expect(ease(0, 1)).toEqual([0.2, true]);
    expect(ease(0.995, 1)).toEqual([1, false]);
  });
  it("turns canvas-normalized colors into pixi numbers", () => {
    expect(toPixiColor("#8a4b23")).toEqual({ color: 0x8a4b23, alpha: 1 });
    expect(toPixiColor("rgba(120, 90, 50, 0.18)")).toEqual({ color: (120 << 16) | (90 << 8) | 50, alpha: 0.18 });
    expect(toPixiColor("nonsense").color).toBe(0x888888);
  });
});

import { shortLabel, restingLabelAlpha } from "./look.js";
describe("graph labels", () => {
  it("shortens long titles and keeps short ones", () => {
    expect(shortLabel("The Theory U")).toBe("The Theory U");
    expect(shortLabel("How our social systems can be considered alive")).toBe("How our social systems ca…");
  });
  it("keeps the current page and its neighbours named at rest", () => {
    expect(restingLabelAlpha({ isCurrent: true, isNeighbour: false, zoomAlpha: 0 })).toBe(1);
    expect(restingLabelAlpha({ isCurrent: false, isNeighbour: true, zoomAlpha: 0 })).toBe(0.8);
    expect(restingLabelAlpha({ isCurrent: false, isNeighbour: false, zoomAlpha: 0.3 })).toBe(0.3);
  });
});
