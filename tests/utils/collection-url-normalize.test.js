import { describe, it, expect } from "vitest";
import { normalizeUrl } from "../../lib/visualizers/collection/resolve.js";

/**
 * The collection's full-text search intersects Pagefind result URLs with the
 * hrefs it rendered from graph.json. Those two sources disagree on case
 * (graph.json slugifies; Pagefind indexes the real output path under a
 * preserve-case permalink strategy), so the raw comparison silently matched
 * nothing — the bug behind "full-text search stopped working" on melt.
 */
describe("normalizeUrl", () => {
  it("makes a preserve-case Pagefind URL match a slugified graph.json id", () => {
    expect(normalizeUrl("/Resources/playlists/")).toBe(normalizeUrl("/resources/playlists/"));
  });

  it("adds a trailing slash", () => {
    expect(normalizeUrl("/a/b")).toBe("/a/b/");
  });

  it("strips index.html", () => {
    expect(normalizeUrl("/a/b/index.html")).toBe("/a/b/");
  });

  it("strips hash and query", () => {
    expect(normalizeUrl("/a/?x=1")).toBe("/a/");
    expect(normalizeUrl("/a/#top")).toBe("/a/");
  });

  it("handles empty and nullish input", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl(null)).toBe("");
    expect(normalizeUrl(undefined)).toBe("");
  });

  it("does not conflate genuinely different pages", () => {
    expect(normalizeUrl("/a/b/")).not.toBe(normalizeUrl("/a/c/"));
  });
});
