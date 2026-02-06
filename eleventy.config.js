export default function (eleventyConfig) {
  // Don't use .gitignore for Eleventy's ignore rules
  // (src/content/ is gitignored since it's generated, but Eleventy must process it)
  eleventyConfig.setUseGitIgnore(false);

  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  // Media files (images from preprocessor) — serve at /media/
  eleventyConfig.addPassthroughCopy({ "src/media": "media" });

  // Watch for changes during development
  eleventyConfig.addWatchTarget("src/assets/");
  eleventyConfig.addWatchTarget("lib/");

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
      .split(" ")
      .map((word, i) => {
        if (i > 0 && small.has(word.toLowerCase())) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
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
