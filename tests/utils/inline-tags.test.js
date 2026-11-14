/**
 * Inline #tags stay where they were written and become links to their tag page (Leon's feedback
 * 59526537: "just leave the inline tags in line"). Opt-in per site: features.inline_tag_links.
 * The tag recognised is the one tag-extractor.js counts, so every link has a tag page behind it.
 */
import { describe, it, expect } from "vitest";
import markdownIt from "markdown-it";
import { configureMarkdown } from "../../scripts/utils/markdown-setup.js";
import { slugifyTag, yamlTags, extractTags } from "../../scripts/utils/tag-extractor.js";

const on = { features: { inline_tag_links: true } };
const md = (siteConfig = on) => configureMarkdown(markdownIt({ html: true }), { siteConfig });

describe("inline tags", () => {
  it("become links in place, keeping their words", () => {
    const html = md().render("#visualizing-time #time-management #phone-usage");
    expect(html).toContain('<a href="/tags/visualizing-time/" class="tag-inline">#visualizing-time</a>');
    expect(html).toContain('<a href="/tags/time-management/" class="tag-inline">#time-management</a>');
    expect(html).toContain('<a href="/tags/phone-usage/" class="tag-inline">#phone-usage</a>');
  });

  it("work mid-sentence and after a line break", () => {
    const html = md().render("A note about #rhythms and\n#weekly-rhythm too");
    expect(html).toContain('about <a href="/tags/rhythms/" class="tag-inline">#rhythms</a> and');
    expect(html).toContain('<a href="/tags/weekly-rhythm/" class="tag-inline">#weekly-rhythm</a> too');
  });

  it("link to the tag page by the tag's lowercase name, showing what was written", () => {
    const html = md().render("Some #Rhythms and #recipe/dessert");
    expect(html).toContain('<a href="/tags/rhythms/" class="tag-inline">#Rhythms</a>');
    expect(html).toContain('<a href="/tags/recipe/dessert/" class="tag-inline">#recipe/dessert</a>');
  });

  it("leave alone what is not a tag: code, links, URLs, words, numbers, escapes, headings", () => {
    const html = md().render(
      "# Title\n\n`#code` [a #link](https://x.org/#frag) https://x.org/#frag a#b #123 \\#escaped",
    );
    expect(html).not.toContain("tag-inline");
    expect(html).toContain("<code>#code</code>");
  });

  it("leave a maker's own system tags as text", () => {
    expect(md().render("#not-for-public #to-review")).not.toContain("tag-inline");
  });

  it("are plain text unless the site turns them on", () => {
    expect(md({}).render("#rhythms")).not.toContain("<a");
  });

  it("carry the site's mount path", () => {
    const html = md({ mount_path: "leon", features: { inline_tag_links: true } }).render("#rhythms");
    expect(html).toContain('href="/leon/tags/rhythms/"');
  });

  it("every tag that becomes a link is a tag the page is counted under", () => {
    const text = "Words #Rhythms, #time-management. and #recipe/dessert!";
    const linked = [...md().render(text).matchAll(/href="\/tags\/([^"]+)\/"/g)].map((m) => m[1]);
    expect(linked.sort()).toEqual(extractTags({}, text).map(slugifyTag).sort());
  });
});

describe("tag helpers", () => {
  it("slugifyTag makes the same address as the tag pages' permalink", () => {
    expect(slugifyTag("visualizing-time")).toBe("visualizing-time");
    expect(slugifyTag("Recipe/Dessert")).toBe("recipe/dessert");
    expect(slugifyTag("two words")).toBe("two-words");
  });

  it("yamlTags are the frontmatter's tags only, normalised", () => {
    expect(yamlTags({ tags: ["#Quote", "garden", "not-for-public"] })).toEqual(["garden", "quote"]);
    expect(yamlTags({ tags: "single" })).toEqual(["single"]);
    expect(yamlTags({})).toEqual([]);
  });
});

describe("the page's foot", () => {
  it("shows the frontmatter tags only when inline tags are links already", async () => {
    const { readFileSync } = await import("fs");
    const extras = readFileSync(new URL("../../themes/bloob-haus-26/partials/page-extras.njk", import.meta.url), "utf-8");
    expect(extras).toContain("{% set footTags = (yaml_tags or []) if site.features.inline_tag_links else tags %}");
    expect(extras).toContain("{% set displayTags = footTags | filterTagList %}");
  });
});
