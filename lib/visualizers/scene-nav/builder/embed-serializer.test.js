import { describe, it, expect } from "vitest";
import { generateEmbedHtml } from "./embed-serializer.js";

const scene = {
  aspectRatio: "16/9",
  edgeFade: 0.05,
  backgrounds: [{ image: "media/bg.png", alt: null, x: 0, y: 0, scale: 100, rotation: 0, mobileOverride: null }],
  elements: [
    {
      type: "image", image: "media/dog.png", alt: "a dog", x: 10, y: 20, scale: 18,
      rotation: 5, resetRotationOnHover: true, label: "a dog", glow: "#FFD700",
      glowIntensity: 1, action: "link", value: "https://example.com", flipH: false,
      flipV: false, onlyShowOn: null, mobileOverride: { x: 50, y: 60 },
    },
  ],
  mobile: { breakpoint: 768, aspectRatio: "9/16", backgrounds: [] },
  debug: true,
};

describe("generateEmbedHtml", () => {
  it("emits dual containers + media query when mobile is set", () => {
    const out = generateEmbedHtml(scene, { cssText: "/*css*/" });
    expect(out).toContain("scene-nav--desktop");
    expect(out).toContain("scene-nav--mobile");
    expect(out).toContain("@media (max-width:768px)");
  });

  it("inlines the provided cssText and includes edge-fade mask", () => {
    const out = generateEmbedHtml(scene, { cssText: "/*MARKER*/" });
    expect(out).toContain("/*MARKER*/");
    expect(out).toContain("mask-image");
  });

  it("strips debug chrome from embeds", () => {
    const out = generateEmbedHtml(scene, { cssText: "" });
    expect(out).not.toContain("data-scene-debug");
    expect(out).not.toContain("scene-nav-data");
  });

  it("absolutizes relative srcs with baseUrl; leaves absolute/data URLs alone", () => {
    const out = generateEmbedHtml(scene, { cssText: "", baseUrl: "https://melt.bloob.haus/" });
    expect(out).toContain('src="https://melt.bloob.haus/media/dog.png"');
    expect(out).toContain('src="https://melt.bloob.haus/media/bg.png"');
    expect(out).not.toContain('src="media/');
  });

  it("bakes the filter mode into the runtime", () => {
    expect(generateEmbedHtml(scene, { cssText: "", filterMode: "and" })).toContain('FILTER_MODE="and"');
    expect(generateEmbedHtml(scene, { cssText: "" })).toContain('FILTER_MODE="or"');
  });

  it("has balanced style/script tags (self-contained snippet)", () => {
    const out = generateEmbedHtml(scene, { cssText: "x" });
    expect((out.match(/<style>/g) || []).length).toBe((out.match(/<\/style>/g) || []).length);
    expect((out.match(/<script>/g) || []).length).toBe((out.match(/<\/script>/g) || []).length);
  });
});
