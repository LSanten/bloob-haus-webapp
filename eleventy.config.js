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

  // Capitalize filter
  eleventyConfig.addFilter("capitalize", function (str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Auto-detect sections from content directory structure
  // Mirrors Hugo's .Site.Sections behavior
  eleventyConfig.addCollection("sections", function (collectionApi) {
    const sections = new Set();
    collectionApi.getAll().forEach((item) => {
      // Extract section from URL: /recipes/challah/ → "recipes"
      const parts = item.url.split("/").filter(Boolean);
      if (parts.length > 1) {
        sections.add(parts[0]);
      }
    });
    return [...sections].sort();
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
