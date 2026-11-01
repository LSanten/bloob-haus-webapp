/**
 * configureMarkdown(): the one markdown-it setup every host uses — Eleventy
 * (eleventy.config.js) and the live visualizer editor. Two hosts, one setup, so
 * a note renders the same in both (shapes.md open question 8).
 */
import { describe, it, expect } from "vitest";
import markdownIt from "markdown-it";
import { configureMarkdown } from "../../scripts/utils/markdown-setup.js";

const md = (siteConfig = {}, visualizers = []) =>
  configureMarkdown(markdownIt({ html: true }), { siteConfig, visualizers });

describe("configureMarkdown", () => {
  it("turns a ::: block into a section with its settings", () => {
    const html = md().render('::: services id=offer title="Our work"\n- one\n:::\n');
    expect(html).toContain(
      `<section class="services" data-vis-settings='{"id":"offer","title":"Our work"}'>`,
    );
  });

  it("emits the raw block text as data-vis-raw, without leaking _raw into settings", () => {
    const html = md().render('::: services _raw="YWJj"\n- one\n:::\n');
    expect(html).toContain('<section class="services" data-vis-raw="YWJj">');
    expect(html).not.toContain("_raw");
  });

  it("keeps a single-word ::: block a plain section", () => {
    expect(md().render("::: bg-dark\ntext\n:::\n")).toContain('<section class="bg-dark">');
  });

  it("makes single line breaks into <br> by default, like Obsidian", () => {
    expect(md().render("a\nb")).toContain("a<br>");
  });

  it("lets a site turn soft breaks off", () => {
    expect(md({ features: { soft_breaks: false } }).render("a\nb")).not.toContain("<br>");
  });

  it("renders footnotes, task lists and {attrs}", () => {
    const html = md().render("x[^1]\n\n- [ ] task\n\n[go](#a){.button}\n\n[^1]: note");
    expect(html).toContain('class="footnote-ref"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('class="button"');
  });

  it("registers a shape's own markdown-it plugin, handing it the site config", () => {
    let seen = null;
    const shape = {
      name: "demo",
      markdownItPlugin: (mdLib, opts) => {
        seen = opts.siteConfig;
      },
    };
    md({ title: "x" }, [shape]);
    expect(seen).toEqual({ title: "x" });
  });
});
