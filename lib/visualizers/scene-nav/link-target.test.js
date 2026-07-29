import { describe, it, expect } from "vitest";
import { isExternalTarget, shouldOpenInNewTab, looksLikeBareDomain } from "./link-target.js";
import { parse, serializeBlock } from "./parser.js";
import { render } from "./renderer.js";

const ORIGIN = "https://melt.bloob.haus";

describe("isExternalTarget", () => {
  it("treats vault-relative and root-relative paths as internal", () => {
    for (const v of ["note.md", "Resources/index.md", "/about-melt/", "../sibling/", "./x.md"]) {
      expect(isExternalTarget(v, ORIGIN), v).toBe(false);
    }
  });

  it("treats anchors and bare queries as internal", () => {
    expect(isExternalTarget("#contact", ORIGIN)).toBe(false);
    expect(isExternalTarget("?tag=massage", ORIGIN)).toBe(false);
  });

  it("treats the same host as internal even when written absolutely", () => {
    expect(isExternalTarget("https://melt.bloob.haus/come-to-melt/", ORIGIN)).toBe(false);
  });

  it("treats a different host as external — including a sibling subdomain", () => {
    expect(isExternalTarget("https://example.com/x", ORIGIN)).toBe(true);
    expect(isExternalTarget("https://leons.bloob.haus/", ORIGIN)).toBe(true);
    expect(isExternalTarget("//example.com/x", ORIGIN)).toBe(true);
  });

  it("treats mailto: and tel: as internal so no blank tab is opened", () => {
    expect(isExternalTarget("mailto:hi@melt.example", ORIGIN)).toBe(false);
    expect(isExternalTarget("tel:+4915112345678", ORIGIN)).toBe(false);
  });

  it("returns false for empty or missing values instead of throwing", () => {
    expect(isExternalTarget("", ORIGIN)).toBe(false);
    expect(isExternalTarget(null, ORIGIN)).toBe(false);
  });
});

describe("shouldOpenInNewTab", () => {
  it("follows the origin when no explicit setting is present", () => {
    expect(shouldOpenInNewTab("note.md", ORIGIN, null)).toBe(false);
    expect(shouldOpenInNewTab("https://example.com", ORIGIN, null)).toBe(true);
    expect(shouldOpenInNewTab("note.md", ORIGIN, undefined)).toBe(false);
  });

  it("lets an explicit setting override the origin in both directions", () => {
    expect(shouldOpenInNewTab("note.md", ORIGIN, true)).toBe(true);
    expect(shouldOpenInNewTab("https://example.com", ORIGIN, false)).toBe(false);
  });
});

describe("looksLikeBareDomain", () => {
  it("flags a scheme-less domain so the builder can suggest https://", () => {
    expect(looksLikeBareDomain("example.com")).toBe(true);
    expect(looksLikeBareDomain("instagram.com/meltberlin")).toBe(true);
  });

  it("does not flag notes, images, paths or proper URLs", () => {
    for (const v of ["note.md", "banner.png", "/about/", "./x", "#anchor", "https://example.com"]) {
      expect(looksLikeBareDomain(v), v).toBe(false);
    }
  });
});

describe("newTab in the v2 grammar", () => {
  const block = (extra) => `- [Contact](contact.png)\n\t- goto: [contact](contact-us.md)\n${extra}`;

  it("defaults to auto (null) when the author wrote nothing", () => {
    expect(parse(block("")).elements[0].newTab).toBe(null);
  });

  it("reads on/off/true/false case-insensitively", () => {
    expect(parse(block("\t- newTab: on")).elements[0].newTab).toBe(true);
    expect(parse(block("\t- newTab: OFF")).elements[0].newTab).toBe(false);
    expect(parse(block("\t- newTab: true")).elements[0].newTab).toBe(true);
    expect(parse(block("\t- newTab: False")).elements[0].newTab).toBe(false);
  });

  it("round-trips through serializeBlock", () => {
    for (const [written, expected] of [["\t- newTab: on", true], ["\t- newTab: off", false], ["", null]]) {
      const scene = parse(block(written));
      const reparsed = parse(serializeBlock(scene).replace(/^::: scene-nav\n|\n:::$/g, ""));
      expect(reparsed.elements[0].newTab, written || "(absent)").toBe(expected);
    }
  });

  it("writes nothing to the markdown while the setting is auto", () => {
    expect(serializeBlock(parse(block("")))).not.toContain("newTab");
  });
});

describe("renderer emits data-new-tab only for an explicit choice", () => {
  const html = (extra) =>
    render(parse(`- [Contact](contact.png)\n\t- goto: [c](contact-us.md)\n${extra}`));

  it("omits the attribute on auto, so the runtime decides from the origin", () => {
    expect(html("")).not.toContain("data-new-tab");
  });

  it("emits true and false when the author chose", () => {
    expect(html("\t- newTab: on")).toContain('data-new-tab="true"');
    expect(html("\t- newTab: off")).toContain('data-new-tab="false"');
  });
});
