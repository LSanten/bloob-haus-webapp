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
  mdLib.use(markdownItAttrs);

  // ::: name [key=value ...] — section containers for styling and visualizers.
  // First word = CSS class. Additional key=value pairs → data-vis-settings JSON.
  // Examples:
  //   ::: bg-dark                        → <section class="bg-dark">
  //   ::: image-grid title="Our Team"    → <section class="image-grid" data-vis-settings='{"title":"Our Team"}'>
  // Backwards compatible — single-word fences are unchanged.
  mdLib.use(markdownItContainer, "section", {
    validate: () => true,
    render(tokens, idx) {
      if (tokens[idx].nesting !== 1) return `</section>\n`;
      const info = tokens[idx].info.trim();
      const spaceIdx = info.indexOf(" ");
      if (spaceIdx === -1) {
        return `<section class="${info}">\n`;
      }
      const cls = info.slice(0, spaceIdx);
      const settingsStr = info.slice(spaceIdx + 1).trim();
      const settings = {};
      const kvPattern = /([\w-]+)=(?:"([^"]*)"|([\S]*))/g;
      let m;
      while ((m = kvPattern.exec(settingsStr)) !== null) {
        settings[m[1]] = m[2] !== undefined ? m[2] : m[3];
      }

      // _raw is injected by inject-container-raw.js during preprocessing.
      // Decode it and emit as data-vis-raw so build-time visualizer transforms
      // can parse raw markdown instead of rendered HTML — keeping parser.js
      // shareable across Eleventy, browser preview, and Obsidian plugin.
      const rawBase64 = settings._raw;
      delete settings._raw;
      const rawAttr = rawBase64 ? ` data-vis-raw="${rawBase64}"` : "";

      // _rawsource is the optional PRE-resolution capture (scene-nav only) — lets a
      // shape's builder round-trip authored, un-resolved refs. Additive; only present
      // when inject-container-raw injected it.
      const rawSourceBase64 = settings._rawsource;
      delete settings._rawsource;
      const rawSourceAttr = rawSourceBase64 ? ` data-vis-raw-source="${rawSourceBase64}"` : "";

      const settingsAttr = Object.keys(settings).length
        ? ` data-vis-settings='${JSON.stringify(settings)}'`
        : "";
      return `<section class="${cls}"${settingsAttr}${rawAttr}${rawSourceAttr}>\n`;
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
