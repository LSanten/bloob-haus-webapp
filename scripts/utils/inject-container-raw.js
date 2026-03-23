/**
 * inject-container-raw.js
 *
 * Scans markdown for ::: container blocks and injects the raw inner content
 * (base64-encoded) as a `_raw="..."` attribute on the opener line.
 *
 * This runs in preprocess-content.js AFTER link resolution but BEFORE
 * markdown-it renders the file. The markdownItContainer renderer in
 * eleventy.config.js picks up _raw and emits it as `data-vis-raw` on the
 * <section> element. Build-time visualizer transforms then read data-vis-raw
 * instead of parsing rendered HTML — the same parser.js can therefore run
 * identically in Eleventy, browser live preview, and an Obsidian plugin.
 *
 * Why base64? The raw content may contain quotes, pipes, backslashes, and
 * other characters that would break an inline attribute value. Base64 is
 * safe inside a quoted HTML attribute.
 *
 * Nesting: nested ::: blocks are handled via a depth counter so only the
 * outermost closing ::: ends the block.
 */

/**
 * Inject _raw="base64" into every ::: container opener in the markdown.
 *
 * @param {string} markdown  Processed markdown content (after link resolution)
 * @returns {string}          Same markdown with _raw attributes injected
 */
export function injectContainerRaw(markdown) {
  const lines = markdown.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match ::: openers that have at least a name — skip bare :::
    // Also skip lines that already have _raw= injected (idempotent)
    const openMatch = /^:::\s+\S/.test(line) && !line.includes("_raw=");

    if (openMatch) {
      // Find the matching closing ::: using a depth counter
      let j = i + 1;
      let depth = 1;

      while (j < lines.length) {
        const inner = lines[j].trimStart();
        if (/^:::/.test(inner)) {
          if (inner === ":::") {
            depth--;
            if (depth === 0) break;
          } else {
            depth++;
          }
        }
        j++;
      }

      // Inner content: everything between opener and closer
      const innerLines = lines.slice(i + 1, j);
      const rawContent = innerLines.join("\n");
      const encoded = Buffer.from(rawContent, "utf-8").toString("base64");

      // Inject _raw onto the opener line
      result.push(line.trimEnd() + ' _raw="' + encoded + '"');

      // Emit inner content + closing ::: unchanged
      for (let k = i + 1; k <= j && k < lines.length; k++) {
        result.push(lines[k]);
      }
      i = j + 1;
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}
