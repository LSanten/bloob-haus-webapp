import { describe, it, expect } from "vitest";
import markdownIt from "markdown-it";
import { markdownItPlugin } from "./index.js";

const md = markdownIt({ html: true }).use(markdownItPlugin);

describe("callouts (> [!type] Title)", () => {
  it("a question callout becomes a callout with its title and body", () => {
    const html = md.render("> [!question] Which bloob object would you make?\n> A record, a recipe card, a map.");
    expect(html).toContain('<aside class="callout callout--question" data-callout="question">');
    expect(html).toContain('<p class="callout__title">Which bloob object would you make?</p>');
    expect(html).toContain("<p>A record, a recipe card, a map.</p>");
    expect(html).toContain("</aside>");
    expect(html).not.toContain("[!question]");
  });
  it("without a title, the type names it (GitHub's [!NOTE] works too)", () => {
    expect(md.render("> [!NOTE]\n> Remember this.")).toContain('<p class="callout__title">Note</p>');
  });
  it("can hold raw HTML, like the homepage's answer field", () => {
    const html = md.render('> [!question] Which bloob object would you make?\n>\n> <div data-bloob-ask="Which?"></div>');
    expect(html).toContain('data-bloob-ask="Which?"');
    expect(html).toMatch(/<aside[^>]*>[\s\S]*data-bloob-ask[\s\S]*<\/aside>/);
  });
  it("an ordinary quote stays a quote", () => {
    expect(md.render("> Just a quote.")).toBe("<blockquote>\n<p>Just a quote.</p>\n</blockquote>\n");
  });
  it("a strange type is still safe", () => {
    const html = md.render('> [!we"ird] Title');
    expect(html).not.toContain('we"ird');
  });
});
