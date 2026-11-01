/**
 * render-note.js — draw a markdown note the way the site build draws it.
 *
 * The live visualizer editor (the "standalone playground" host in
 * docs/architecture/visualizers.md → "three hosts, one renderer") runs the
 * build's own steps, not a copy of them:
 *
 *   injectContainerRaw → configureMarkdown (shared with eleventy.config.js)
 *   → each shape's transform(), in transformOrder, runtime shapes skipped
 *
 * Steps that need the whole vault (wiki-link resolution, publish filtering)
 * are not run: a note in the editor has no vault around it.
 */
import markdownIt from "markdown-it";
import { configureMarkdown } from "../../scripts/utils/markdown-setup.js";
import { injectContainerRaw } from "../../scripts/utils/inject-container-raw.js";
import { stripLeadingTitleHeading, stripInlineMarkdown } from "../../scripts/utils/title-deduplicator.js";

/**
 * @param {{ visualizers: object[], siteConfig?: object }} options
 *   visualizers: shape modules ({ name, type, transform, transformOrder, markdownItPlugin })
 * @returns {(markdown: string) => string} renders one note to HTML
 */
export function createNoteRenderer({ visualizers, siteConfig = {} }) {
  const md = configureMarkdown(markdownIt({ html: true }), { siteConfig, visualizers });
  // Same filter and order as eleventy.config.js → "visualizers" transform.
  const transforms = visualizers
    .filter((v) => typeof v.transform === "function" && v.type !== "runtime")
    .sort((a, b) => (a.transformOrder || 0) - (b.transformOrder || 0));

  const render = (markdown) => {
    let html = md.render(injectContainerRaw(markdown));
    for (const viz of transforms) {
      html = viz.transform(html, { siteConfig, pageUrl: "/" });
    }
    return html;
  };
  render.md = md;
  return render;
}

/**
 * A note drawn as a whole page: the `article` shape's frame around the body,
 * with the builder's own title rule (stripLeadingTitleHeading): the first
 * `# heading` is the title and leaves the body, a `##` right under it is the
 * subtitle. Mirrors lib/visualizers/article/layout.njk's markup; a note with
 * no `# heading` gets no header (in the build its file name would be the title).
 */
export function createPageRenderer(options) {
  const renderNote = createNoteRenderer(options);
  const { md } = renderNote;
  return (markdown) => {
    const h1 = markdown.match(/^# (.+)$/m);
    const title = h1 ? stripInlineMarkdown(h1[1]).trim() : null;
    const { content, subtitle, titleMd } = title
      ? stripLeadingTitleHeading(markdown, title)
      : { content: markdown };
    const header = titleMd
      ? `<header class="article-header"><h1 class="article-title">${md.renderInline(titleMd)}</h1>` +
        (subtitle ? `<p class="article-subtitle">${md.renderInline(subtitle)}</p>` : "") +
        `</header>`
      : "";
    return `<article class="article-page">${header}<div class="article-body">${renderNote(content)}</div></article>`;
  };
}
