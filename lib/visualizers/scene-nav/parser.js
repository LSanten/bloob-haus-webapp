/**
 * Scene Nav Visualizer — Parser
 *
 * Pure function: raw text (from inside a `::: scene-nav ... :::` shape-named block) →
 * scene data object. No side effects, JSON-serializable output.
 *
 * v2 nested-bullet grammar (locked — see docs/architecture/visualizers.md and the
 * shapes architecture unification plan):
 *
 *   ::: scene-nav
 *   aspectRatio: 16/9            ← header lines: key: value until first top-level bullet
 *   edgeFade: 0.05
 *   mobile: breakpoint 768, aspectRatio 9/16
 *   debug: on
 *
 *   - [alt text](image.png)      ← top-level bullet (no leading whitespace) = element
 *   \t- background                ← bare flag: this element is a background layer
 *   \t- at: 45.8, -3.6            ← x, y percentages
 *   \t- scale: 18
 *   \t- rotation: 36
 *   \t- glow: #00E5FF
 *   \t- glowIntensity: 1.5
 *   \t- label: hover text         ← default = md-link alt text
 *   \t- goto: [x](page.md)        ← or https://… or #anchor-id → action/value derived
 *   \t- filter: character:bloob   ← optional; action=filter
 *   \t- onlyShowOn: mobile
 *   \t- flipH / flipV             ← bare flags
 *   \t- mobile:                   ← nested bullets, one more level deep
 *   \t\t- at: 58, 10.3
 *   \t\t- scale: 29.5
 *   :::
 *
 * Indentation is never assumed to be a fixed tab width — any deeper indentation
 * (tabs or spaces, any amount) counts as nesting. Comparison is by leading-whitespace
 * string length, tracked relative to the indent length of the owning `mobile:` line.
 *
 * Element type defaults to "image". Future types: "text", "video", etc.
 * onlyShowOn: null (show everywhere) | ["desktop"] | ["mobile"] | ["mobile","tablet"]
 * mobileOverride: merged over desktop values when rendering the mobile container.
 *
 * Old YAML code-fence grammar removed 2026-07-20 (js-yaml dependency dropped from
 * this file). See docs/implementation-plans/ for the shape-unification plan.
 *
 * @param {string} rawText - Raw text content from inside the `::: scene-nav` block
 * @returns {{ aspectRatio: string|null, edgeFade: number, backgrounds: Array,
 *   elements: Array, mobile: object|null, debug: boolean }}
 */

const DEFAULTS = { type: "image", glow: "#FFD700", glowIntensity: 1 };

function emptyScene() {
  return {
    aspectRatio: null,
    edgeFade: 0,
    backgrounds: [],
    elements: [],
    mobile: null,
    debug: false,
  };
}

function parseImageRef(text) {
  const md = text.match(/^\[(.*?)\]\((.+?)\)$/);
  if (md) return { image: decodeURIComponent(md[2]), alt: md[1].trim() || null };
  const wiki = text.match(/^\[\[(.+?)\]\]$/);
  if (wiki) return { image: wiki[1], alt: null };
  return { image: text.trim(), alt: null };
}

function deriveAction(props) {
  if (props.filter) return { action: "filter", value: props.filter };
  const g = props.goto;
  if (!g) return { action: "link", value: null };
  const md = g.match(/^\[.*?\]\((.+?)\)$/);
  const wiki = g.match(/^\[\[(.+?)\]\]$/);
  const target = md ? md[1] : wiki ? wiki[1] : g;
  if (target.startsWith("#")) return { action: "anchor", value: target.slice(1) };
  return { action: "link", value: target };
}

function parseAt(v) { // "45.8, -3.6" → {x, y}
  const [x, y] = String(v).split(",").map(s => Number(s.trim()));
  return { x: x || 0, y: y || 0 };
}

function parseOnlyShowOn(val) {
  if (!val) return null;
  return String(val).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Interprets on/true → true, off/false → false (case-insensitive); anything else → null.
// Shared boolean vocabulary for scene-nav's tri-state attributes.
function booleanKeyword(value) {
  const s = String(value).trim().toLowerCase();
  if (s === "on" || s === "true") return true;
  if (s === "off" || s === "false") return false;
  return null;
}

// Tri-state: undefined → alt (default); off/false → false (suppressed); on/true → alt; else override string.
function resolveLabel(rawLabel, alt) {
  if (rawLabel === undefined) return alt;
  const kw = booleanKeyword(rawLabel);
  if (kw === false) return false;
  if (kw === true) return alt;
  return rawLabel;
}

// Parses one property-line's content (after "- ") into { key, value }.
// Bare flags (no "key: value" colon form) return value: null.
function parsePropLine(content) {
  const m = content.match(/^([a-zA-Z]+):\s*(.*)$/);
  if (m) return { key: m[1], value: m[2] };
  return { key: content.trim(), value: null };
}

// Applies a parsed {key, value} onto a props bucket (either an element's top-level
// props or its mobile-override props). Bare flags → true. "at" splits into x/y.
// Numeric keys are coerced; everything else is stored as the raw string.
function applyProp(bucket, key, value) {
  if (value === null) {
    bucket[key] = true;
    return;
  }
  if (key === "at") {
    const { x, y } = parseAt(value);
    bucket.x = x;
    bucket.y = y;
    return;
  }
  if (key === "scale" || key === "rotation" || key === "glowIntensity") {
    bucket[key] = Number(value);
    return;
  }
  bucket[key] = value;
}

function parseMobileHeader(value) {
  const result = { breakpoint: 768, aspectRatio: null, backgrounds: [] };
  String(value).split(",").forEach(part => {
    const m = part.trim().match(/^(\S+)\s+(.*)$/);
    if (!m) return;
    const [, k, v] = m;
    if (k === "breakpoint") result.breakpoint = Number(v) || 768;
    else if (k === "aspectRatio") result.aspectRatio = v.trim();
  });
  return result;
}

export function parse(rawText) {
  rawText = String(rawText).replace(/\r\n?/g, "\n");
  const lines = rawText.split("\n");

  let aspectRatio = null;
  let edgeFade = 0;
  let debugFlag = false;
  let mobileHeader = null;
  let malformed = false;
  let seenBullet = false;

  let current = null; // { image, alt, props: {}, mobileProps: {}, mobileIndentLen: number|null }
  const opened = [];

  function finalizeCurrent() {
    if (current) opened.push(current);
    current = null;
  }

  for (const line of lines) {
    if (!seenBullet && /^-\s+/.test(line)) seenBullet = true;

    if (!seenBullet) {
      // Header phase: blank lines ignored; "key: value" lines recognized;
      // anything else is a structural error (e.g. leftover old-grammar content).
      if (line.trim() === "") continue;
      const hm = line.match(/^([a-zA-Z]+):\s*(.*)$/);
      if (hm) {
        const key = hm[1];
        const value = hm[2].trim();
        if (key === "aspectRatio") aspectRatio = value;
        else if (key === "edgeFade") edgeFade = Number(value) || 0;
        else if (key === "debug") debugFlag = /^(on|true)$/i.test(value);
        else if (key === "mobile") mobileHeader = parseMobileHeader(value);
        // unknown header keys are ignored (forward-compatible)
      } else {
        malformed = true;
      }
      continue;
    }

    // Element phase
    if (/^-\s+/.test(line)) {
      finalizeCurrent();
      const text = line.replace(/^-\s+/, "").trim();
      const { image, alt } = parseImageRef(text);
      current = { image, alt, props: {}, mobileProps: {}, mobileIndentLen: null };
      continue;
    }

    const propMatch = line.match(/^(\s+)-\s+(.*)$/);
    if (propMatch) {
      const indent = propMatch[1];
      const content = propMatch[2].trimEnd();
      if (!current) {
        malformed = true;
        continue;
      }
      const { key, value } = parsePropLine(content);
      if (key === "mobile" && value === "") {
        current.mobileIndentLen = indent.length;
        continue;
      }
      const inMobile = current.mobileIndentLen !== null && indent.length > current.mobileIndentLen;
      applyProp(inMobile ? current.mobileProps : current.props, key, value);
      continue;
    }

    if (line.trim() === "") continue;
    malformed = true;
  }
  finalizeCurrent();

  const backgrounds = [];
  const elements = [];

  for (const el of opened) {
    const { image, alt, props: p, mobileProps } = el;
    const hasMobileOverride = el.mobileIndentLen !== null && Object.keys(mobileProps).length > 0;

    if (p.background) {
      backgrounds.push({
        image,
        alt,
        x: p.x || 0,
        y: p.y || 0,
        scale: p.scale || 100,
        rotation: p.rotation || 0,
        mobileOverride: hasMobileOverride ? mobileProps : null,
      });
      continue;
    }

    const { action, value } = deriveAction(p);
    elements.push({
      type: DEFAULTS.type,
      image,
      alt,
      x: p.x || 0,
      y: p.y || 0,
      scale: p.scale || 18,
      rotation: p.rotation || 0,
      resetRotationOnHover: true,
      label: resolveLabel(p.label, alt),
      glow: p.glow || DEFAULTS.glow,
      glowIntensity: p.glowIntensity || DEFAULTS.glowIntensity,
      hoverGlow: p.hoverGlow !== undefined ? booleanKeyword(p.hoverGlow) !== false : true,
      hoverScale: p.hoverScale !== undefined ? booleanKeyword(p.hoverScale) !== false : true,
      ...(p.overlay ? { overlay: String(p.overlay).trim() } : {}),
      action,
      value,
      // Raw authored goto string (e.g. "[label](note.md)" or "[[note]]"), kept so the
      // builder can round-trip the exact authored form instead of the derived value.
      ...(p.goto !== undefined ? { gotoRaw: p.goto } : {}),
      flipH: p.flipH === true,
      flipV: p.flipV === true,
      onlyShowOn: p.onlyShowOn ? parseOnlyShowOn(p.onlyShowOn) : null,
      mobileOverride: hasMobileOverride ? mobileProps : null,
    });
  }

  if (elements.length === 0 && backgrounds.length === 0 && malformed) {
    console.warn("[scene-nav] v2 grammar parse error: unrecognized structure (old YAML grammar or malformed block)");
    return emptyScene();
  }

  return { aspectRatio, edgeFade, backgrounds, elements, mobile: mobileHeader, debug: debugFlag };
}

// ── Serializer (inverse of parse) ───────────────────────────────────────────────

function appendMobileProps(lines, override, depth) {
  const indent = "\t".repeat(depth);
  if (override.x !== undefined || override.y !== undefined) {
    lines.push(`${indent}- at: ${override.x ?? 0}, ${override.y ?? 0}`);
  }
  if (override.scale !== undefined) lines.push(`${indent}- scale: ${override.scale}`);
  if (override.rotation !== undefined) lines.push(`${indent}- rotation: ${override.rotation}`);
  if (override.label !== undefined) lines.push(`${indent}- label: ${override.label}`);
  if (override.glow !== undefined) lines.push(`${indent}- glow: ${override.glow}`);
  if (override.glowIntensity !== undefined) lines.push(`${indent}- glowIntensity: ${override.glowIntensity}`);
  if (override.image !== undefined) lines.push(`${indent}- image: ${override.image}`);
}

/**
 * Inverse of parse(): scene data → `::: scene-nav\n...\n:::` block text.
 * Emits only non-default values; tab-indented. Round-trips through parse().
 * @param {object} sceneData
 * @returns {string}
 */
export function serializeBlock(sceneData) {
  const d = sceneData || {};
  const lines = ["::: scene-nav"];

  if (d.aspectRatio) lines.push(`aspectRatio: ${d.aspectRatio}`);
  if (d.edgeFade) lines.push(`edgeFade: ${d.edgeFade}`);
  if (d.mobile) {
    let mobileLine = `mobile: breakpoint ${d.mobile.breakpoint}`;
    if (d.mobile.aspectRatio) mobileLine += `, aspectRatio ${d.mobile.aspectRatio}`;
    lines.push(mobileLine);
  }
  if (d.debug) lines.push("debug: on");
  lines.push("");

  for (const bg of d.backgrounds || []) {
    lines.push(`- [${bg.alt || ""}](${bg.image})`);
    lines.push("\t- background");
    if (bg.x || bg.y) lines.push(`\t- at: ${bg.x}, ${bg.y}`);
    if (bg.scale !== 100) lines.push(`\t- scale: ${bg.scale}`);
    if (bg.rotation) lines.push(`\t- rotation: ${bg.rotation}`);
    if (bg.mobileOverride) {
      lines.push("\t- mobile:");
      appendMobileProps(lines, bg.mobileOverride, 2);
    }
  }

  for (const el of d.elements || []) {
    lines.push(`- [${el.alt || ""}](${el.image})`);
    if (el.x || el.y) lines.push(`\t- at: ${el.x}, ${el.y}`);
    if (el.scale !== 18) lines.push(`\t- scale: ${el.scale}`);
    if (el.rotation) lines.push(`\t- rotation: ${el.rotation}`);
    if (el.glow && el.glow !== DEFAULTS.glow) lines.push(`\t- glow: ${el.glow}`);
    if (el.glowIntensity !== 1) lines.push(`\t- glowIntensity: ${el.glowIntensity}`);
    if (el.label === false) lines.push(`\t- label: false`);
    else if (el.label != null && el.label !== el.alt) lines.push(`\t- label: ${el.label}`);
    if (el.hoverGlow === false) lines.push(`\t- hoverGlow: false`);
    if (el.hoverScale === false) lines.push(`\t- hoverScale: false`);
    if (el.overlay) lines.push(`\t- overlay: ${el.overlay}`);
    if (el.action === "filter" && el.value) lines.push(`\t- filter: ${el.value}`);
    else if (el.gotoRaw) lines.push(`\t- goto: ${el.gotoRaw}`); // authored form (round-trips [label](note.md))
    else if (el.action === "anchor" && el.value) lines.push(`\t- goto: #${el.value}`);
    else if (el.action === "link" && el.value) lines.push(`\t- goto: ${el.value}`);
    if (el.flipH) lines.push("\t- flipH");
    if (el.flipV) lines.push("\t- flipV");
    if (el.onlyShowOn) lines.push(`\t- onlyShowOn: ${el.onlyShowOn.join(", ")}`);
    if (el.mobileOverride) {
      lines.push("\t- mobile:");
      appendMobileProps(lines, el.mobileOverride, 2);
    }
  }

  lines.push(":::");
  return lines.join("\n");
}
