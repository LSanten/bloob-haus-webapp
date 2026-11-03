/**
 * markdown-setup.js — the one markdown-it configuration every host uses.
 *
 * Eleventy (eleventy.config.js) and the live visualizer editor both call
 * configureMarkdown(), so a note renders the same wherever it is drawn: the
 * "one shared markdown-it configuration is the baseline every shape gets" of
 * shapes.md open question 8. Pure and browser-safe: no fs, no Node built-ins.
 */
import taskLists from "markdown-it-task-lists";
import markdownItContainer from "markdown-it-container";
import markdownItAttrs from "markdown-it-attrs";
import { renderSectionOpen } from "./section-container.js";
import markdownItFootnote from "markdown-it-footnote";

/**
 * @param {import("markdown-it")} mdLib  a markdown-it instance (Eleventy's, or a new one)
 * @param {{ siteConfig?: object, visualizers?: object[] }} options
 * @returns the same instance, configured
 */
export function configureMarkdown(mdLib, { siteConfig = {}, visualizers = [] } = {}) {
  // Single line breaks → <br> by default (matches Obsidian behavior).
  // Opt out per-site with features: { soft_breaks: false } in _bloob-settings.md.
  mdLib.set({ linkify: true });
  if (siteConfig.features?.soft_breaks !== false) {
    mdLib.set({ breaks: true });
  }
  mdLib.use(markdownItFootnote);
  mdLib.use(taskLists, { enabled: false, label: true });
  // {.class} {#id} {attr=value} attribute syntax on links, images, headings
  // e.g. [CONTACT US](#footer){.button} → <a href="#footer" class="button">
  // Allow-listed (PR #4): without this, `{onclick=…}` or `{href=javascript:…}` in authored
  // markdown would be emitted verbatim. Defence in depth only: this markdown-it runs with
  // html:true, so authored raw HTML is trusted; hardening untrusted markdown starts with html:false.
  mdLib.use(markdownItAttrs, {
    allowedAttributes: [
      "id", "class", "title", "target", "rel", "width", "height", "loading",
      "style", "role", /^data-/, /^aria-/,
    ],
  });

  // ::: name [key=value ...] — section containers for styling and visualizers.
  // First word = CSS class. Additional key=value pairs → data-vis-settings JSON.
  // Examples:
  //   ::: bg-dark                        → <section class="bg-dark">
  //   ::: image-grid title="Our Team"    → <section class="image-grid" data-vis-settings='{"title":"Our Team"}'>
  // Backwards compatible — single-word fences are unchanged.
  mdLib.use(markdownItContainer, "section", {
    validate: () => true,
    // The opening tag is built by section-container.js (escaped; unit-tested). _raw / _rawsource
    // are injected by inject-container-raw.js during preprocessing and emitted as data-vis-raw /
    // data-vis-raw-source, so build-time visualizer transforms parse raw markdown.
    render(tokens, idx) {
      if (tokens[idx].nesting !== 1) return `</section>\n`;
      return renderSectionOpen(tokens[idx].info);
    },
  });

  // Shapes that change how markdown itself renders export a markdown-it
  // plugin from their index.js (today: foldable, for `## > Heading`). It is
  // handed the site config so a site can opt out through a feature flag.
  for (const viz of visualizers) {
    if (typeof viz.markdownItPlugin === "function") {
      mdLib.use(viz.markdownItPlugin, { siteConfig });
    }
  }
  return mdLib;
}
