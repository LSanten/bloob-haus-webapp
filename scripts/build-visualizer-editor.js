/**
 * build-visualizer-editor.js — builds the live visualizer editor into _visualizers/
 *
 *   node scripts/build-visualizer-editor.js            build once
 *   node scripts/build-visualizer-editor.js --serve    build, then serve on http://localhost:8020
 *
 * The output is the future bloob.haus/visualizers/ (spec:
 * docs/superpowers/specs/2026-11-01-live-shape-editor.md):
 *
 *   index.html               the catalog, with a small live preview per visualizer
 *   <name>/index.html        the editor: markdown beside the live visualizer
 *   <name>/ai.md             the card an AI is given to write for it
 *   llms.txt                 every AI card, one line each
 *   editor.js, editor.css    the page (render-note.js + ui.js + the shapes' own code)
 *   assets/<name>.css|.js    each shape's styles.css and browser.js, as the site loads them
 *   themes/*.css             base.css and base-tokens.css: the preview's one look
 *
 * Two shelves (Leon, 2026-11-01: sorted by who switches a visualizer on):
 *   Always on    the writing rules every note gets (catalog.json), one shared page
 *   You place it a visualizer you ask for with a block, one page per starter note
 *                in lib/visualizer-editor/examples/
 * The third kind, visualizers the site's theme places (search, tags, graph), is
 * a site setting, not something you write, so it is not in this catalog.
 * Every listed shape's index.js must bundle for the browser (no fs: its data
 * lives in its own block); one that does not fails the build loudly.
 */
import * as esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { isMainModule } from "./utils/is-main.js";
import { aiCard, aiIndex, displayName } from "../lib/visualizer-editor/ai-card.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_visualizers");
const SHAPES = path.join(ROOT, "lib/visualizers");
const EDITOR = path.join(ROOT, "lib/visualizer-editor");
const SHIM = path.join(EDITOR, "buffer-shim.js");

async function readIf(file) {
  return (await fs.pathExists(file)) ? fs.readFile(file, "utf-8") : undefined;
}

/** "Block" / "Whole page": where a visualizer can be used, read from its manifest. */
export function scopeLabels(manifest) {
  const method = typeof manifest.activation === "string" ? manifest.activation : manifest.activation?.method;
  const labels = [];
  if (["container", "code-fence", "heading-marker"].includes(method)) labels.push("Block");
  if (manifest.filescope) labels.push("Whole page");
  return labels;
}

async function shapeInfo(name) {
  const dir = path.join(SHAPES, name);
  const manifest = JSON.parse((await readIf(path.join(dir, "manifest.json"))) || "{}");
  return {
    name,
    manifest,
    schema: await readIf(path.join(dir, "schema.md")),
    hasCss: await fs.pathExists(path.join(dir, "styles.css")),
    hasBrowser: await fs.pathExists(path.join(dir, "browser.js")),
  };
}

/**
 * What the editor shows, from lib/visualizer-editor/:
 *   catalog.json → alwaysOn: the writing rules every note gets (one shared page)
 *   examples/<name>.md → a visualizer you place, with its starter note
 * Returns the shape modules to load and the pages to build.
 */
export async function liveVisualizers() {
  const catalog = JSON.parse(await fs.readFile(path.join(EDITOR, "catalog.json"), "utf-8"));
  const placed = (await fs.readdir(path.join(EDITOR, "examples")))
    .filter((f) => f.endsWith(".md") && f !== "always-on.md")
    .map((f) => f.slice(0, -3))
    .sort();
  const shapes = await Promise.all([...new Set([...catalog.alwaysOn.visualizers, ...placed])].map(shapeInfo));

  const pages = [
    {
      name: "always-on",
      title: catalog.alwaysOn.title,
      description: catalog.alwaysOn.description,
      example: await fs.readFile(path.join(EDITOR, "examples", "always-on.md"), "utf-8"),
      shelf: "always-on",
      labels: ["Every note"],
    },
  ];
  for (const name of placed) {
    const s = shapes.find((x) => x.name === name);
    pages.push({
      name,
      title: displayName(name),
      description: s.manifest.description || "",
      blurb: catalog.blurbs?.[name],
      example: await fs.readFile(path.join(EDITOR, "examples", `${name}.md`), "utf-8"),
      schema: s.schema,
      shelf: "placed",
      labels: scopeLabels(s.manifest),
    });
  }
  return { shapes, pages };
}

function page({ title, view, root, visualizer }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="${root}editor.css">
</head>
<body data-view="${view}" data-root="${root}"${visualizer ? ` data-visualizer="${visualizer}"` : ""}>
<div id="app"></div>
<script type="module" src="${root}editor.js"></script>
</body>
</html>
`;
}

export async function build() {
  const { shapes, pages } = await liveVisualizers();
  await fs.emptyDir(OUT);

  // The page: the editor host plus every live shape's own index.js, one bundle.
  const imports = shapes.map((v, i) => `import * as v${i} from ${JSON.stringify(path.join(SHAPES, v.name, "index.js"))};`);
  const modules = shapes.map((v, i) => `{ ...${JSON.stringify({ name: v.name, hasCss: v.hasCss, hasBrowser: v.hasBrowser })}, module: v${i} }`);
  const pageData = pages.map(({ schema, ...rest }) => rest);
  await esbuild.build({
    stdin: {
      contents: `import { start } from ${JSON.stringify(path.join(EDITOR, "ui.js"))};\n${imports.join("\n")}\nstart({ modules: [${modules.join(",\n")}], pages: ${JSON.stringify(pageData)} });\n`,
      resolveDir: ROOT,
      sourcefile: "visualizer-editor-entry.js",
    },
    bundle: true,
    platform: "browser",
    format: "esm",
    inject: [SHIM],
    outfile: path.join(OUT, "editor.js"),
    logLevel: "warning",
  });
  await fs.copy(path.join(EDITOR, "editor.css"), path.join(OUT, "editor.css"));

  // Each shape's styles and browser behavior, exactly as the site ships them,
  // plus the article page every note is drawn inside.
  await fs.copy(path.join(SHAPES, "article", "styles.css"), path.join(OUT, "assets", "article.css"));
  for (const v of shapes) {
    const dir = path.join(SHAPES, v.name);
    if (v.hasCss) await fs.copy(path.join(dir, "styles.css"), path.join(OUT, "assets", `${v.name}.css`));
    if (v.hasBrowser) {
      await esbuild.build({
        entryPoints: [path.join(dir, "browser.js")],
        bundle: true,
        format: "iife",
        outfile: path.join(OUT, "assets", `${v.name}.js`),
        logLevel: "warning",
      });
    }
  }
  for (const p of pages) {
    await fs.outputFile(path.join(OUT, p.name, "index.html"),
      page({ title: `${p.title} · Bloob Haus visualizers`, view: "editor", root: "../", visualizer: p.name }));
    await fs.outputFile(path.join(OUT, p.name, "ai.md"), aiCard(p));
  }

  await fs.copy(path.join(ROOT, "themes/_base/assets/css/base.css"), path.join(OUT, "themes", "base.css"));
  await fs.copy(path.join(EDITOR, "base-tokens.css"), path.join(OUT, "themes", "base-tokens.css"));
  await fs.outputFile(path.join(OUT, "index.html"), page({ title: "Bloob Haus visualizers", view: "catalog", root: "./" }));
  await fs.outputFile(path.join(OUT, "llms.txt"), aiIndex(pages));

  console.log(`[visualizers] ${pages.length} pages, ${shapes.length} shapes: ${shapes.map((v) => v.name).join(", ")}`);
  return { shapes, pages };
}

if (isMainModule(import.meta.url)) {
  await build();
  if (process.argv.includes("--serve")) {
    const ctx = await esbuild.context({});
    const { port } = await ctx.serve({ servedir: OUT, port: 8020 });
    console.log(`[visualizers] http://localhost:${port}/`);
  }
}
