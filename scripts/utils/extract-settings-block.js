/**
 * extract-settings-block.js
 *
 * Finds the first ::: settings ... ::: block in a markdown body, parses its
 * content as YAML, and returns both the parsed settings and the body with the
 * block removed.
 *
 * Used by the file-scope shape dispatch in preprocess-content.js so that
 * bloob-shape: files can declare per-instance configuration without fighting
 * with YAML frontmatter conventions.
 */

import jsYaml from "js-yaml";

/**
 * @param {string} markdown
 * @returns {{ settings: object, body: string }}
 */
export function extractSettingsBlock(markdown) {
  const lines = markdown.split("\n");
  let startIdx = -1;
  let endIdx = -1;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();

    if (startIdx === -1 && /^:::\s*settings\b/.test(trimmed)) {
      startIdx = i;
      depth = 1;
      continue;
    }

    if (startIdx !== -1) {
      if (/^:::/.test(trimmed)) {
        // Tolerate trailing whitespace on the closer — "::: " must not fall
        // through to the else branch and count as a nested opener.
        if (trimmed.trimEnd() === ":::") {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        } else {
          depth++;
        }
      }
    }
  }

  if (startIdx === -1) return { settings: {}, body: markdown };

  const innerLines = lines.slice(startIdx + 1, endIdx === -1 ? lines.length : endIdx);
  let settings = {};
  try {
    // YAML treats `[` as the start of an inline sequence, which breaks markdown
    // link values like `apple: [text](url)`. Pre-quote any unquoted markdown
    // link values before handing to js-yaml.
    const yamlText = quoteMarkdownLinkValues(innerLines.join("\n"));
    settings = jsYaml.load(yamlText) || {};
  } catch (e) {
    console.warn(`[settings-block] Failed to parse YAML: ${e.message}`);
  }

  const bodyLines = [
    ...lines.slice(0, startIdx),
    ...(endIdx !== -1 ? lines.slice(endIdx + 1) : []),
  ];
  const body = bodyLines.join("\n").trim();

  return { settings, body };
}

/**
 * Wraps bare markdown link values `[text](url)` in double quotes so js-yaml
 * doesn't mistake the leading `[` for an inline sequence.
 * Only touches lines that look like `key: [...](...) ` — leaves everything else alone.
 */
function quoteMarkdownLinkValues(yamlText) {
  return yamlText.replace(
    /^(\s*[\w-]+\s*:\s*)(\[[^\]]*\]\([^)]+\))\s*$/gm,
    (_, keyPart, linkPart) => `${keyPart}"${linkPart.replace(/"/g, '\\"')}"`
  );
}
