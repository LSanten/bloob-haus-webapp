/**
 * The `structured-data` fence in _bloob-settings.md: schema.org JSON-LD that tells search
 * engines who the site belongs to (a person, a business). The author pastes JSON only — the
 * kind an AI writes when asked — and the builder wraps it in <script type="application/ld+json">.
 * Invalid JSON is skipped with a warning instead of breaking every page's <head>.
 */
import { describe, it, expect, vi } from "vitest";
import { structuredDataScript, composeSnippets } from "../../scripts/utils/bloob-settings-reader.js";

const PERSON = '{ "@context": "https://schema.org", "@type": "Person", "name": "Leon Santen" }';

describe("structuredDataScript", () => {
  it("wraps JSON in a JSON-LD script tag, minified", () => {
    expect(structuredDataScript(PERSON)).toBe(
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Leon Santen"}</script>',
    );
  });

  it("accepts a list of entities", () => {
    expect(structuredDataScript('[{"@type":"Person"},{"@type":"WebSite"}]')).toContain('[{"@type":"Person"},{"@type":"WebSite"}]');
  });

  it("returns null and warns on invalid JSON", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(structuredDataScript('{ "name": "missing quote }')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("cannot close its own script tag early", () => {
    const out = structuredDataScript('{ "description": "</script><script>alert(1)</script>" }');
    expect(out.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe("composeSnippets", () => {
  it("puts structured data into the head snippets", () => {
    const { head } = composeSnippets({ "structured-data": PERSON });
    expect(head).toContain('<script type="application/ld+json">');
  });

  it("keeps other head snippets alongside it", () => {
    const { head } = composeSnippets({ "structured-data": PERSON, "header-snippet": "<meta name=x>" });
    expect(head).toContain("<meta name=x>");
    expect(head).toContain("application/ld+json");
  });

  it("leaves the head empty when there is nothing (an empty fence is off)", () => {
    expect(composeSnippets({})).toEqual({ head: "", bodyEnd: "" });
  });

  it("routes footer snippets to the end of the body", () => {
    expect(composeSnippets({ "footer-snippet": "<script>f()</script>" }).bodyEnd).toBe("<script>f()</script>");
  });
});
