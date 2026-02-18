import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8"),
);

const hook = await import("./preprocess-hook.js");

const mod = await import("./index.js");

// ─── manifest.json ────────────────────────────────────────────────────────────

describe("graph visualizer manifest", () => {
  it("has required fields", () => {
    expect(manifest.name).toBe("graph");
    expect(manifest.type).toMatch(/^(runtime|build-time|hybrid)$/);
    expect(manifest.version).toBeDefined();
    expect(manifest.description).toBeDefined();
    expect(manifest.activation).toBeDefined();
  });

  it("is hybrid type (build-time transform + runtime browser)", () => {
    expect(manifest.type).toBe("hybrid");
  });

  it("references files that exist on disk", () => {
    for (const [key, filename] of Object.entries(manifest.files || {})) {
      const filePath = path.join(__dirname, filename);
      expect(
        fs.existsSync(filePath),
        `manifest.files.${key} → "${filename}" should exist`,
      ).toBe(true);
    }
  });

  it("documents the TODO positioning note", () => {
    expect(manifest.notes?.positioning).toMatch(/TODO/i);
  });
});

// ─── index.js exports ─────────────────────────────────────────────────────────

describe("graph visualizer index.js exports", () => {
  it("exports name matching manifest", () => {
    expect(mod.name).toBe(manifest.name);
  });

  it("exports type matching manifest", () => {
    expect(mod.type).toBe(manifest.type);
  });

  it("exports a transform function", () => {
    expect(typeof mod.transform).toBe("function");
  });
});

// ─── transform() — code fence replacement ─────────────────────────────────────

describe("graph transform()", () => {
  it("replaces a ```graph code fence with a graph container div", () => {
    const html = `<p>Before</p>
<pre><code class="language-graph"></code></pre>
<p>After</p>`;
    const result = mod.transform(html);
    expect(result).toContain('class="graph-visualizer"');
    expect(result).not.toContain("<pre><code");
  });

  it("sets data-graph-position to inline on the container", () => {
    const html = `<pre><code class="language-graph"></code></pre>`;
    const result = mod.transform(html);
    expect(result).toContain('data-graph-position="inline"');
  });

  it("parses YAML settings from the code fence body", () => {
    const html = `<pre><code class="language-graph">depth: 3\nshow_full_graph: false</code></pre>`;
    const result = mod.transform(html);
    expect(result).toContain('"depth":3');
    expect(result).toContain('"show_full_graph":false');
  });

  it("handles an empty code fence body (no YAML)", () => {
    const html = `<pre><code class="language-graph"></code></pre>`;
    const result = mod.transform(html);
    // Should produce a container with empty settings object
    expect(result).toContain("graph-visualizer");
    expect(result).toContain("{}");
  });

  it("decodes HTML entities in the code fence body before parsing", () => {
    // markdown-it encodes special chars inside code blocks
    const html = `<pre><code class="language-graph">colors:\n  node: &quot;#ff0000&quot;</code></pre>`;
    const result = mod.transform(html);
    expect(result).toContain('"node":"#ff0000"');
  });

  it("leaves non-graph code blocks untouched", () => {
    const html = `<pre><code class="language-js">console.log('hello')</code></pre>`;
    const result = mod.transform(html);
    expect(result).toBe(html);
  });

  it("replaces multiple code fences in the same page", () => {
    const html = `
<pre><code class="language-graph">depth: 1</code></pre>
<p>middle</p>
<pre><code class="language-graph">depth: 2</code></pre>
    `.trim();
    const result = mod.transform(html);
    const count = (result.match(/graph-visualizer/g) || []).length;
    expect(count).toBe(2);
  });

  it("passes through HTML without any graph code fences unchanged", () => {
    const html = "<p>Hello world</p>";
    expect(mod.transform(html)).toBe(html);
  });
});

// ─── preprocess-hook.js ───────────────────────────────────────────────────────

describe("graph preprocess-hook.js exports", () => {
  it("exports GRAPH_DEFAULTS with required keys", () => {
    expect(hook.GRAPH_DEFAULTS).toBeDefined();
    expect(typeof hook.GRAPH_DEFAULTS.only_if_linked).toBe("boolean");
    expect(typeof hook.GRAPH_DEFAULTS.depth).toBe("number");
    expect(typeof hook.GRAPH_DEFAULTS.show_full_graph).toBe("boolean");
    expect(typeof hook.GRAPH_DEFAULTS.colors).toBe("object");
  });

  it("exports preprocessHook function", () => {
    expect(typeof hook.preprocessHook).toBe("function");
  });

  it("exports mergeGraphSettings function", () => {
    expect(typeof hook.mergeGraphSettings).toBe("function");
  });

  it("preprocess-hook.js file exists on disk", () => {
    expect(fs.existsSync(path.join(__dirname, "preprocess-hook.js"))).toBe(true);
  });
});

describe("mergeGraphSettings()", () => {
  it("returns all defaults when called with an empty object", () => {
    const result = hook.mergeGraphSettings({});
    expect(result.only_if_linked).toBe(hook.GRAPH_DEFAULTS.only_if_linked);
    expect(result.depth).toBe(hook.GRAPH_DEFAULTS.depth);
    expect(result.show_full_graph).toBe(hook.GRAPH_DEFAULTS.show_full_graph);
  });

  it("overrides a single setting while preserving the rest", () => {
    const result = hook.mergeGraphSettings({ depth: 4 });
    expect(result.depth).toBe(4);
    expect(result.only_if_linked).toBe(hook.GRAPH_DEFAULTS.only_if_linked);
    expect(result.show_full_graph).toBe(hook.GRAPH_DEFAULTS.show_full_graph);
  });

  it("overrides only_if_linked to false", () => {
    const result = hook.mergeGraphSettings({ only_if_linked: false });
    expect(result.only_if_linked).toBe(false);
    expect(result.depth).toBe(hook.GRAPH_DEFAULTS.depth);
  });

  it("deep merges partial color overrides without dropping other colors", () => {
    const result = hook.mergeGraphSettings({
      colors: { node: "#ff0000" },
    });
    expect(result.colors.node).toBe("#ff0000");
    // other color keys come from defaults (empty object, so no extra keys added)
  });

  it("handles missing colors key gracefully", () => {
    const result = hook.mergeGraphSettings({ depth: 1 });
    expect(result.colors).toEqual({});
  });

  it("returns a new object, not a mutation of GRAPH_DEFAULTS", () => {
    const result = hook.mergeGraphSettings({ depth: 99 });
    expect(hook.GRAPH_DEFAULTS.depth).not.toBe(99);
    expect(result.depth).toBe(99);
  });
});
