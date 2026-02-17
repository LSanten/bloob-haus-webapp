import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import taskLists from "markdown-it-task-lists";
import pluginRss from "@11ty/eleventy-plugin-rss";
import Image from "@11ty/eleventy-img";
import {
  loadSiteConfig,
  resolveSiteName,
} from "./scripts/utils/config-loader.js";

// Auto-discover visualizer packages from lib/visualizers/
async function loadVisualizers() {
  const dir = "lib/visualizers";
  if (!existsSync(dir)) return [];

  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const visualizers = [];
  for (const name of folders) {
    const indexPath = join(dir, name, "index.js");
    if (existsSync(indexPath)) {
      const mod = await import(`./${indexPath}`);
      visualizers.push({ name, ...mod });
    }
  }
  return visualizers;
}

export default async function (eleventyConfig) {
  // Load site configuration
  const siteName = resolveSiteName();
  const siteConfig = await loadSiteConfig(siteName);

  // Load visualizer modules for build-time transforms
  const visualizers = await loadVisualizers();
  // RSS feed plugin (provides dateToRfc3339, htmlToAbsoluteUrls, etc.)
  eleventyConfig.addPlugin(pluginRss);

  // Don't use .gitignore for Eleventy's ignore rules
  // (src/content/ is gitignored since it's generated, but Eleventy must process it)
  eleventyConfig.setUseGitIgnore(false);

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  // Media files (images from preprocessor) — serve at /media/
  eleventyConfig.addPassthroughCopy({ "src/media": "media" });
  // OG preview images — serve at /og/ (separate from /media/ to avoid optimization)
  eleventyConfig.addPassthroughCopy({ "src/og": "og" });

  // Watch for changes during development
  eleventyConfig.addWatchTarget("src/assets/");
  eleventyConfig.addWatchTarget("lib/");

  // Enable task list checkboxes in markdown (- [ ] and - [x] syntax)
  eleventyConfig.amendLibrary("md", (mdLib) => {
    mdLib.use(taskLists, { enabled: false, label: true });
  });

  // Date formatting filter
  eleventyConfig.addFilter("dateFormat", function (date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // Truncate filter (Hugo has this built-in)
  eleventyConfig.addFilter("truncate", function (str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.slice(0, len) + "…";
  });

  // Head filter — take first N items from array (like Hugo's `first`)
  eleventyConfig.addFilter("head", function (array, n) {
    if (!Array.isArray(array)) return [];
    return array.slice(0, n);
  });

  // Capitalize filter
  eleventyConfig.addFilter("capitalize", function (str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Title case filter — matches Hugo's .Title behavior (lowercase small words)
  // Also converts hyphens to spaces for slugified strings
  eleventyConfig.addFilter("titleCase", function (str) {
    if (!str) return "";
    const small = new Set([
      "a",
      "an",
      "and",
      "as",
      "at",
      "but",
      "by",
      "for",
      "in",
      "nor",
      "of",
      "on",
      "or",
      "so",
      "the",
      "to",
      "up",
    ]);
    return str
      .replace(/-/g, " ")
      .split(" ")
      .map((word, i) => {
        if (i > 0 && small.has(word.toLowerCase())) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  });

  // Filter out system/reserved tags from display
  function filterTagList(tags) {
    return (tags || []).filter(
      (tag) => !["all", "nav", "posts", "not-for-public"].includes(tag),
    );
  }
  eleventyConfig.addFilter("filterTagList", filterTagList);

  // Slugify filter for tag URLs
  eleventyConfig.addFilter("slugify", function (str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s/-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // Collection of all unique tags (for tag page pagination)
  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tagSet = new Set();
    collectionApi.getAll().forEach((item) => {
      (item.data.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return filterTagList([...tagSet]).sort();
  });

  // Auto-detect sections from content directory structure
  // Mirrors Hugo's .Site.Sections behavior
  eleventyConfig.addCollection("sections", function (collectionApi) {
    const sections = new Set();
    collectionApi.getAll().forEach((item) => {
      const parts = item.url.split("/").filter(Boolean);
      if (parts.length > 1) {
        sections.add(parts[0]);
      }
    });
    return [...sections].sort();
  });

  // Per-section collections
  eleventyConfig.addCollection("recipes", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/recipes/**/*.md")
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  eleventyConfig.addCollection("notes", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/notes/**/*.md")
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  eleventyConfig.addCollection("resources", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/resources/**/*.md")
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  eleventyConfig.addCollection("listsOfFavorites", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/lists of favorites/**/*.md")
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  // Backlinks: compute which pages link to each other
  // Uses addCollection to attach backlinks data to each page.
  // Reads source files from disk (stable API, not Eleventy internals).
  if (siteConfig.features.backlinks !== false)
    eleventyConfig.addCollection("withBacklinks", function (collectionApi) {
      const all = collectionApi.getAll();

      // Extract internal links from markdown source (exclude images)
      function extractLinks(source) {
        const links = [];
        // Markdown links [text](url) — exclude images ![alt](url)
        const mdLinks = source.matchAll(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g);
        for (const m of mdLinks) {
          const url = m[2];
          // Only internal links (starting with /)
          if (url.startsWith("/") && !url.startsWith("/media/")) {
            links.push(url.replace(/\/$/, "")); // normalize trailing slash
          }
        }
        return links;
      }

      // First pass: build a map of page URL → outgoing links
      const linkMap = new Map();
      for (const page of all) {
        if (!page.inputPath.endsWith(".md")) continue;
        try {
          const source = readFileSync(page.inputPath, "utf-8");
          linkMap.set(page.url.replace(/\/$/, ""), extractLinks(source));
        } catch {
          // File may not exist if it's a generated page
        }
      }

      // Second pass: for each page, find all pages that link TO it
      for (const page of all) {
        const pageUrl = page.url.replace(/\/$/, "");
        page.data.backlinks = all
          .filter((other) => {
            if (other.url === page.url) return false;
            const otherUrl = other.url.replace(/\/$/, "");
            const outgoing = linkMap.get(otherUrl);
            return outgoing?.includes(pageUrl);
          })
          .map((p) => ({ url: p.url, title: p.data.title }));
      }

      return all;
    });

  // Image optimization transform
  // Finds <img src="/media/..."> in rendered HTML, generates WebP + original
  // at reasonable sizes, replaces with <picture> element.
  // Only /media/ paths are optimized — everything in /media/ is user content
  // (including nested folders). OG images live at /og/ and are never touched.
  const mediaConfig = siteConfig.media || {};
  if (mediaConfig.optimize !== false)
    eleventyConfig.addTransform("optimizeImages", async function (content) {
      if (!this.page.outputPath?.endsWith(".html")) return content;

      const imgRegex = /<img\s+([^>]*?)src="(\/media\/[^"]+)"([^>]*?)>/gi;
      const matches = [...content.matchAll(imgRegex)];
      if (matches.length === 0) return content;

      let result = content;
      for (const match of matches) {
        const [originalTag, before, src, after] = match;
        const inputPath = join("src", decodeURIComponent(src));
        if (!existsSync(inputPath)) continue;

        // Extract alt text if present
        const altMatch = (before + after).match(/alt="([^"]*)"/);
        const alt = altMatch ? altMatch[1] : "";

        // Skip GIFs — serve untouched to preserve animation
        const ext = src.toLowerCase().split(".").pop();
        if (ext === "gif") continue;

        try {
          // Preserve PNG format for transparency; use JPEG for photos
          const configFormats = mediaConfig.formats || ["webp", "jpeg"];
          const formats = ext === "png" ? ["webp", "png"] : configFormats;

          const metadata = await Image(inputPath, {
            widths: mediaConfig.widths || [600, 1200],
            formats,
            outputDir: "_site/media/optimized",
            urlPath: "/media/optimized/",
            filenameFormat: function (id, src, width, format) {
              const name = src.split("/").pop().split(".")[0];
              return `${name}-${width}w.${format}`;
            },
          });

          const pictureHtml = Image.generateHTML(metadata, {
            alt,
            sizes: "(max-width: 600px) 100vw, 800px",
            loading: "lazy",
            decoding: "async",
          });

          result = result.replace(originalTag, pictureHtml);
        } catch (e) {
          // If image processing fails, keep original tag
          console.warn(`[image] Failed to optimize ${src}: ${e.message}`);
        }
      }
      return result;
    });

  // Visualizer build-time transform
  // Runs each visualizer's transform() on rendered HTML output.
  // Runtime-only visualizers (like checkbox-tracker) return content unchanged.
  // Build-time visualizers (future: timeline, recipe-card) modify HTML here.
  const buildTimeVisualizers = visualizers.filter(
    (v) => typeof v.transform === "function" && v.type !== "runtime",
  );

  if (buildTimeVisualizers.length > 0) {
    eleventyConfig.addTransform("visualizers", function (content) {
      if (!this.page.outputPath?.endsWith(".html")) return content;

      let result = content;
      for (const viz of buildTimeVisualizers) {
        result = viz.transform(result);
      }
      return result;
    });
  }

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
