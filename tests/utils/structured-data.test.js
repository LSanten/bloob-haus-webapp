/**
 * schema.org JSON-LD, one block per page (scripts/utils/structured-data.js).
 *
 * The `structured-data` fence in _bloob-settings.md tells search engines who the site belongs to
 * (a person, a business). The author pastes JSON only, the kind an AI writes when asked. When a
 * page has a license, the page joins it in one @graph instead of getting a second block.
 * Invalid JSON is skipped with a warning instead of breaking every page's <head>.
 */
import { describe, it, expect, vi } from "vitest";
import {
  parseStructuredData,
  licensedPageNode,
  mergeStructuredData,
  jsonLdScript,
} from "../../scripts/utils/structured-data.js";
import { composeSnippets } from "../../scripts/utils/bloob-settings-reader.js";

const PERSON_RAW = '{ "@context": "https://schema.org", "@type": "Person", "name": "Leon Santen" }';
const PERSON = { "@context": "https://schema.org", "@type": "Person", name: "Leon Santen" };
const LICENSE = { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/", known: true };
const URL = "https://leons.bloob.haus/marbles/RADICALNESS/";

describe("parseStructuredData", () => {
  it("reads the fence's JSON", () => {
    expect(parseStructuredData(PERSON_RAW)).toEqual(PERSON);
  });

  it("accepts a list of entities", () => {
    expect(parseStructuredData('[{"@type":"Person"},{"@type":"WebSite"}]')).toEqual([{ "@type": "Person" }, { "@type": "WebSite" }]);
  });

  it("returns null and warns on invalid JSON", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStructuredData('{ "name": "missing quote }')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns null when there is no fence", () => {
    expect(parseStructuredData(undefined)).toBeNull();
    expect(parseStructuredData("")).toBeNull();
  });
});

describe("licensedPageNode", () => {
  it("is the page as a WebPage carrying the license URL", () => {
    expect(licensedPageNode(LICENSE, URL, "Radicalness")).toEqual({
      "@type": "WebPage",
      url: URL,
      name: "Radicalness",
      license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    });
  });

  it("names a license it has no URL for", () => {
    expect(licensedPageNode({ name: "All rights reserved", url: null, known: false }, URL).license).toEqual({
      "@type": "CreativeWork",
      name: "All rights reserved",
    });
  });

  it("is null without a license", () => {
    expect(licensedPageNode(null, URL, "x")).toBeNull();
  });
});

describe("mergeStructuredData: one block per page", () => {
  const page = licensedPageNode(LICENSE, URL, "Radicalness");

  it("is the fence alone when the page has no license", () => {
    expect(mergeStructuredData(PERSON, null)).toBe(PERSON);
  });

  it("is the page alone when there is no fence", () => {
    expect(mergeStructuredData(null, page)).toEqual({ "@context": "https://schema.org", ...page });
  });

  it("puts fence and page in one @graph", () => {
    expect(mergeStructuredData(PERSON, page)).toEqual({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "Person", name: "Leon Santen" }, page],
    });
  });

  it("spreads a list or an existing @graph into it", () => {
    const list = [{ "@type": "Person" }, { "@type": "WebSite" }];
    expect(mergeStructuredData(list, page)["@graph"]).toEqual([...list, page]);
    const graph = { "@context": "https://schema.org", "@graph": list };
    expect(mergeStructuredData(graph, page)["@graph"]).toEqual([...list, page]);
  });

  it("keeps a node's own context when it isn't schema.org", () => {
    const other = { "@context": "https://example.org/vocab", "@type": "Thing" };
    expect(mergeStructuredData(other, page)["@graph"][0]).toBe(other);
  });

  it("is null when there is nothing", () => {
    expect(mergeStructuredData(null, null)).toBeNull();
  });
});

describe("jsonLdScript", () => {
  it("wraps JSON in a JSON-LD script tag, minified", () => {
    expect(jsonLdScript(PERSON)).toBe(
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Leon Santen"}</script>',
    );
  });

  it("cannot close its own script tag early", () => {
    const out = jsonLdScript({ description: "</script><script>alert(1)</script>" });
    expect(out.match(/<\/script>/g)).toHaveLength(1);
  });

  it("is empty when there is nothing", () => {
    expect(jsonLdScript(null)).toBe("");
  });
});

describe("composeSnippets", () => {
  it("leaves structured data out of the head snippets (it has its own partial)", () => {
    const { head } = composeSnippets({ "structured-data": PERSON_RAW });
    expect(head).toBe("");
  });

  it("keeps other head snippets", () => {
    const { head } = composeSnippets({ "structured-data": PERSON_RAW, "header-snippet": "<meta name=x>" });
    expect(head).toBe("<meta name=x>");
  });

  it("leaves the head empty when there is nothing (an empty fence is off)", () => {
    expect(composeSnippets({})).toEqual({ head: "", bodyEnd: "" });
  });

  it("routes footer snippets to the end of the body", () => {
    expect(composeSnippets({ "footer-snippet": "<script>f()</script>" }).bodyEnd).toBe("<script>f()</script>");
  });
});
