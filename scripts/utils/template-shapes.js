/**
 * Host glue between the site builder and the engine (lib/visualizers/_engine). Reads template
 * shapes from disk (the engine itself never touches files), decides which layout a template shape
 * gets, and writes the one-line layouts the engine draws through.
 *
 * A template shape without its own layout.njk only comes alive on a theme whose theme.yaml says
 * `objects: true` (bloob-haus-26). Everywhere else it is ignored exactly as an unknown shape is
 * today, so sites on other themes do not change.
 */
import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";

export async function loadTemplateShapes(visualizersDir) {
  const shapes = new Map();
  if (!(await fs.pathExists(visualizersDir))) return shapes;
  for (const entry of await fs.readdir(visualizersDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const dir = path.join(visualizersDir, entry.name);
    const manifestPath = path.join(dir, "manifest.json");
    if (!(await fs.pathExists(manifestPath))) continue;
    let manifest;
    try {
      manifest = await fs.readJson(manifestPath);
    } catch {
      continue;
    }
    if (manifest.format !== "template") continue;
    const openPath = path.join(dir, "open.html");
    if (!(await fs.pathExists(openPath))) {
      // Being built: no theme draws it yet, and the builder must not guess a layout for it.
      shapes.set(entry.name, { name: entry.name, manifest, templates: {}, hasOwnLayout: false, draft: true });
      continue;
    }
    const templates = { open: await fs.readFile(openPath, "utf-8") };
    const closedPath = path.join(dir, "closed.html");
    if (await fs.pathExists(closedPath)) templates.closed = await fs.readFile(closedPath, "utf-8");
    shapes.set(entry.name, {
      name: entry.name,
      manifest,
      templates,
      hasOwnLayout: await fs.pathExists(path.join(dir, "layout.njk")),
    });
  }
  return shapes;
}

export function themeSupportsObjects(config, rootDir) {
  const file = path.join(rootDir, "themes", config?.theme || "", "theme.yaml");
  if (!config?.theme || !fs.existsSync(file)) return false;
  try {
    return yaml.load(fs.readFileSync(file, "utf-8"))?.objects === true;
  } catch {
    return false;
  }
}

export function templateShapeLayout(shape, { objects }) {
  if (shape.draft) return null;
  if (shape.hasOwnLayout) return `layouts/${path.basename(shape.manifest.defaultLayout || `${shape.name}.njk`)}`;
  return objects ? `layouts/${shape.name}.njk` : null;
}

export function generatedLayout(name, { inside } = {}) {
  const head = `---\nlayout: layouts/base.njk\n---\n`;
  // The page's words go into the search index (unless the page is unlisted); a shape that opens
  // into the article gets this from the article itself.
  if (inside !== "article") {
    return `${head}<div {% if _bloob_unlisted %}data-pagefind-ignore{% else %}data-pagefind-body{% endif %}>{% bloobObject "${name}", content %}</div>\n`;
  }
  // The object opens into the shared article (one article for everyone). The outermost object
  // shares, so the article's own share bar steps aside; the page's extras ride on the sheet.
  return (
    head +
    `{%- set inside_object = true -%}\n` +
    `{%- set bloobInside -%}\n{% include "partials/article-reading.njk" %}\n{% include "partials/page-extras.njk" ignore missing %}\n{%- endset -%}\n` +
    `{% bloobObject "${name}", content, bloobInside %}\n`
  );
}

export async function writeTemplateShapeLayouts(shapes, { objects, layoutsDir }) {
  if (!objects) return [];
  const written = [];
  for (const shape of shapes.values()) {
    if (shape.hasOwnLayout || shape.draft) continue;
    await fs.outputFile(path.join(layoutsDir, `${shape.name}.njk`), generatedLayout(shape.name, { inside: shape.manifest.inside }));
    written.push(`${shape.name}.njk`);
  }
  return written;
}

/**
 * Which shape a page is drawn as: the one it names, else the haus's default. On a theme with
 * objects the homepage stays a page (the haus's front door, not one more object) unless it names
 * a shape itself; other themes are unchanged.
 */
export function pageShape({ bloobShape, defaultShape, relativePath, objects, templateShapes }) {
  if (bloobShape) return bloobShape;
  const isHome = String(relativePath).replace(/\\/g, "/") === "index.md";
  if (objects && isHome && templateShapes?.has(defaultShape)) return null;
  return defaultShape || null;
}
