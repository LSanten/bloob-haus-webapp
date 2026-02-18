import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8"),
);

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
