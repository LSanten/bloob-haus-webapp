/**
 * The meta description a page gets when its author didn't write one.
 * Head-only: never written into `description`, which melt and warm-kitchen render visibly.
 */
import { describe, it, expect } from "vitest";
import { buildSeoDescription } from "../../scripts/utils/seo-description.js";

const SITE = "Engineering an alternative";

describe("buildSeoDescription", () => {
  it("uses the frontmatter description untouched", () => {
    expect(
      buildSeoDescription({ description: "Engineering an alternative", subtitle: "Other", body: "Text.", siteDescription: "x" }),
    ).toBe("Engineering an alternative");
  });

  it("joins the subtitle and the first paragraph, cut to 155 characters", () => {
    const result = buildSeoDescription({
      subtitle: "Radiant Floors and Fresh Air Define This All-Electric School Building",
      body:
        "This was a unique opportunity to design a truly high-performance, all-electric multi-purpose building and kitchen for the Oakland Unified School District.",
      siteDescription: SITE,
    });
    expect(result.startsWith("Radiant Floors and Fresh Air Define This All-Electric School Building — This was a unique opportunity")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith("…")).toBe(true);
  });

  it("strips Obsidian and fence syntax", () => {
    const body =
      "::: card-preview\n[[a]]\n:::\n\n```collection\nsource: folder=x\n```\n\nSee [[Campbell Library|the library]] and **bold** <b>tag</b>.";
    expect(buildSeoDescription({ body, siteDescription: SITE })).toBe("See the library and bold tag.");
  });

  it("skips headings, tables and image-only lines (list items count as prose, like post-card excerpts)", () => {
    const body = "## Heading\n\n![[photo.png]]\n\n| a | b |\n| - | - |\n\n- item\n\nReal prose here.";
    expect(buildSeoDescription({ body, siteDescription: SITE })).toBe("item Real prose here.");
  });

  it("falls back to the site description when the body is only a fence", () => {
    const body = "```collection\nsource: folder=notes\ndisplay: cards\n```";
    expect(buildSeoDescription({ body, siteDescription: SITE })).toBe(SITE);
  });

  it("uses the subtitle alone when there is no prose", () => {
    const body = "```collection\nsource: folder=notes\n```";
    expect(buildSeoDescription({ subtitle: "Everything **written** down", body, siteDescription: SITE })).toBe(
      "Everything written down",
    );
  });

  it("never cuts mid-word", () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const result = buildSeoDescription({ body: words, siteDescription: SITE });
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith("…")).toBe(true);
    const kept = result.slice(0, -1);
    expect(kept.endsWith(" ")).toBe(false);
    expect(words.startsWith(kept + " ")).toBe(true);
  });

  it("drops Obsidian callout markers", () => {
    const body = "> [!info] Note\n> Callout text here.";
    expect(buildSeoDescription({ body, siteDescription: SITE })).toBe("Note Callout text here.");
    const folded = "> [!warning]- Careful\n> Folded text.";
    expect(buildSeoDescription({ body: folded, siteDescription: SITE })).toBe("Careful Folded text.");
  });

  it("ignores a blank frontmatter description", () => {
    expect(buildSeoDescription({ description: "  ", body: "Body text.", siteDescription: SITE })).toBe("Body text.");
  });
});
