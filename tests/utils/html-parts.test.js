import { describe, it, expect } from "vitest";
import { splitHtml } from "../../scripts/utils/html-parts.js";

const DOC = `<!doctype html>
<html><head>
  <meta   name="viewport" content="width=device-width" />
  <title>A</title>
  <link rel="stylesheet" href="/x.css" />
  <link rel="canonical"   href="https://e.com/a/" />
  <meta property="og:title" content="A" />
</head>
<body class="page"><p>x</p></body></html>`;

describe("splitHtml", () => {
  it("collects title, metas and canonical from <head>, whitespace collapsed, sorted", () => {
    expect(splitHtml(DOC).headTags).toEqual([
      '<link rel="canonical" href="https://e.com/a/" />',
      '<meta name="viewport" content="width=device-width" />',
      '<meta property="og:title" content="A" />',
      "<title>A</title>",
    ]);
  });

  it("returns the body's inner HTML", () => {
    expect(splitHtml(DOC).body).toBe("<p>x</p>");
  });

  it("copes with a document that has no head or body", () => {
    expect(splitHtml("plain")).toEqual({ headTags: [], body: "plain" });
  });
});
