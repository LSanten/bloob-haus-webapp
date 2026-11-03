/**
 * `unlisted_folders` in _bloob-settings.md: every page inside these folders is unlisted, whatever
 * its own frontmatter says. Protects a client folder from the one forgotten `visibility: unlisted`.
 */
import { describe, it, expect } from "vitest";
import { normalizeUnlistedFolders, isInUnlistedFolder } from "../../scripts/utils/unlisted-folders.js";
import { mergeBloobSettings } from "../../scripts/utils/bloob-settings-reader.js";

describe("normalizeUnlistedFolders", () => {
  it("accepts a list or a single folder, trims slashes and blanks", () => {
    expect(normalizeUnlistedFolders(["/clients/", " drafts ", ""])).toEqual(["clients", "drafts"]);
    expect(normalizeUnlistedFolders("clients")).toEqual(["clients"]);
  });

  it("is empty when the setting is absent", () => {
    expect(normalizeUnlistedFolders(undefined)).toEqual([]);
    expect(normalizeUnlistedFolders(null)).toEqual([]);
  });
});

describe("isInUnlistedFolder", () => {
  const folders = ["clients", "work/private"];

  it("matches any depth inside a listed folder", () => {
    expect(isInUnlistedFolder("clients/8cfd4d8b/demo-client/_index.md", folders)).toBe(true);
    expect(isInUnlistedFolder("work/private/a.md", folders)).toBe(true);
  });

  it("accepts Windows path separators", () => {
    expect(isInUnlistedFolder("clients\\8cfd4d8b\\report.md", folders)).toBe(true);
  });

  it("ignores case, like the slugified URLs", () => {
    expect(isInUnlistedFolder("Clients/a.md", folders)).toBe(true);
  });

  it("matches whole folder names only", () => {
    expect(isInUnlistedFolder("clients-public/a.md", folders)).toBe(false);
    expect(isInUnlistedFolder("work/private-notes/a.md", folders)).toBe(false);
    expect(isInUnlistedFolder("projects/clients.md", folders)).toBe(false);
  });

  it("matches nothing when no folders are set", () => {
    expect(isInUnlistedFolder("clients/a.md", [])).toBe(false);
  });
});

describe("mergeBloobSettings — unlisted_folders", () => {
  it("takes the vault's list (the vault owns this setting)", () => {
    const merged = mergeBloobSettings({ site: {} }, { unlisted_folders: ["clients"] });
    expect(merged.unlisted_folders).toEqual(["clients"]);
  });

  it("falls back to the site config, then to none", () => {
    expect(mergeBloobSettings({ site: {}, unlisted_folders: ["x"] }, {}).unlisted_folders).toEqual(["x"]);
    expect(mergeBloobSettings({ site: {} }, {}).unlisted_folders).toEqual([]);
  });
});

import { isPageUnlisted } from "../../scripts/utils/unlisted-folders.js";

describe("isPageUnlisted — the one rule graph.json, post cards and the noindex flag all use", () => {
  const base = { frontmatter: {}, tags: [], relativePath: "notes/a.md", unlistedFolders: ["clients"] };

  it("is false for a normal page", () => {
    expect(isPageUnlisted(base)).toBe(false);
  });

  it("is true for visibility: unlisted (graph.json used to list these)", () => {
    expect(isPageUnlisted({ ...base, frontmatter: { visibility: "unlisted" } })).toBe(true);
  });

  it("is true for website_status: unlisted and the #unlisted tag", () => {
    expect(isPageUnlisted({ ...base, frontmatter: { website_status: "unlisted" } })).toBe(true);
    expect(isPageUnlisted({ ...base, tags: ["unlisted"] })).toBe(true);
    expect(isPageUnlisted({ ...base, tags: ["#unlisted"] })).toBe(true);
  });

  it("is true inside an unlisted folder even when the page says public", () => {
    expect(
      isPageUnlisted({ ...base, relativePath: "clients/x/a.md", frontmatter: { website_status: "public" } }),
    ).toBe(true);
  });
});
