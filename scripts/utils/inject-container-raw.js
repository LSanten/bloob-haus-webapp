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
 * Inject `${attr}="base64"` into ::: container openers in the markdown.
 *
 * Default (`attr:"_raw"`, all shapes) is the post-resolution capture the container
 * renderer reads as `data-vis-raw`. Passing `attr:"_rawsource"` + `onlyShape:"scene-nav"`
 * captures the PRE-resolution raw for scene-nav only (emitted as `data-vis-raw-source`),
 * so a shape's builder can round-trip the authored, un-resolved refs. Both attributes can
 * coexist on the same opener (source injected before link resolution, _raw after).
 *
 * @param {string} markdown  Markdown content
 * @param {{ attr?: string, onlyShape?: string|null }} [options]
 * @returns {string}          Same markdown with the attribute injected
 */
export function injectContainerRaw(markdown, options = {}) {
  const attr = options.attr || "_raw";
  const onlyShape = options.onlyShape || null;
  const lines = markdown.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match ::: openers that have at least a name — skip bare :::
    // Accepts both :::name and ::: name (space is optional).
    // Skip lines that already have this attribute injected (idempotent).
    const shapeName = (line.match(/^:::\s*(\S+)/) || [])[1] || null;
    const openMatch =
      /^:::\s*\S/.test(line) &&
      !line.includes(attr + "=") &&
      (!onlyShape || shapeName === onlyShape);

    if (openMatch) {
      // Find the matching closing ::: using a depth counter
      let j = i + 1;
      let depth = 1;

      while (j < lines.length) {
        const inner = lines[j].trimStart();
        if (/^:::/.test(inner)) {
          // Tolerate trailing whitespace on the closer — same fix as
          // extract-settings-block.js: "::: " must not count as a nested opener.
          if (inner.trimEnd() === ":::") {
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

      // Inject the attribute onto the opener line
      result.push(line.trimEnd() + " " + attr + '="' + encoded + '"');

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
