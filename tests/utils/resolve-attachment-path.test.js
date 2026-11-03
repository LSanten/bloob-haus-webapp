import { describe, it, expect } from "vitest";
import { resolveAttachmentPath } from "../../scripts/utils/attachment-resolver.js";

const index = {
  byBasename: { "front.png": "/media/front.png", "label.jpg": "/media/label.jpg" },
  byVaultPath: { "covers/assets/front.png": "/covers/assets/front.png" },
};
const at = { sourceVaultPath: "covers/halloween-2026.md" };

describe("resolveAttachmentPath (one picture named in the frontmatter)", () => {
  it("a path next to the note resolves like a body picture", () =>
    expect(resolveAttachmentPath("assets/front.png", index, at)).toBe("/covers/assets/front.png"));
  it("a bare name falls back to the name", () => expect(resolveAttachmentPath("label.jpg", index, at)).toBe("/media/label.jpg"));
  it("Obsidian's [[...]] and ![[...]] forms work", () => {
    expect(resolveAttachmentPath("[[label.jpg]]", index, at)).toBe("/media/label.jpg");
    expect(resolveAttachmentPath("![[label.jpg]]", index, at)).toBe("/media/label.jpg");
  });
  it("a web address stays as it is", () => expect(resolveAttachmentPath("https://x.org/a.png", index, at)).toBe("https://x.org/a.png"));
  it("an unknown picture gives null", () => expect(resolveAttachmentPath("nope.png", index, at)).toBeNull());
});
