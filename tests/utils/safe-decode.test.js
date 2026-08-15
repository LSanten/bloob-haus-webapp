import { describe, it, expect } from "vitest";
import { safeDecode } from "../../scripts/utils/safe-decode.js";
import { resolveMarkdownLinks } from "../../scripts/utils/markdown-link-resolver.js";
import { resolveAttachments } from "../../scripts/utils/attachment-resolver.js";
import { resolveRedirect } from "../../scripts/utils/redirect-resolver.js";
import { handleTransclusions } from "../../scripts/utils/transclusion-handler.js";

describe("safeDecode", () => {
  it("decodes valid percent-escapes", () => {
    expect(safeDecode("Sign%20up.png")).toBe("Sign up.png");
  });

  it("returns the input verbatim when the escape is malformed", () => {
    expect(safeDecode("50% off flyer.png")).toBe("50% off flyer.png");
  });

  it("leaves a string with no escapes untouched", () => {
    expect(safeDecode("Contact us.png")).toBe("Contact us.png");
  });

  it("never throws on a lone trailing percent", () => {
    expect(() => safeDecode("weird%")).not.toThrow();
    expect(safeDecode("weird%")).toBe("weird%");
  });

  it("passes through non-string-ish values without throwing", () => {
    expect(() => safeDecode("")).not.toThrow();
    expect(safeDecode("")).toBe("");
  });
});

/**
 * A literal `%` in a filename is legal on every filesystem and plausible in a vault
 * ("50% off flyer.png"). Before 2026-08-15 it threw URIError: URI malformed and took
 * the whole build down, naming neither the file nor the step.
 *
 * Each case below is a real pipeline entry point that decodes an author-controlled name.
 */
describe("a literal % in a filename never aborts the build", () => {
  const emptyIndex = { pages: {}, titleLookup: {}, filenameLookup: {} };

  it("markdown-link-resolver survives it", () => {
    expect(() => resolveMarkdownLinks("[x](50% off flyer.md)", emptyIndex)).not.toThrow();
  });

  it("attachment-resolver survives it in a markdown image", () => {
    const index = { byBasename: {}, byVaultPath: {} };
    expect(() => resolveAttachments("![](50% off flyer.png)", index, { sourceVaultPath: "a.md" }))
      .not.toThrow();
  });

  it("attachment-resolver survives it in a wiki embed", () => {
    const index = { byBasename: {}, byVaultPath: {} };
    expect(() => resolveAttachments("![[50% off flyer.png]]", index, { sourceVaultPath: "a.md" }))
      .not.toThrow();
  });

  it("redirect-resolver survives it", () => {
    expect(() => resolveRedirect("[x](50% off flyer.md)", emptyIndex)).not.toThrow();
  });

  it("transclusion-handler survives it", () => {
    expect(() => handleTransclusions("![x](50% off flyer.md)", emptyIndex)).not.toThrow();
  });
});
