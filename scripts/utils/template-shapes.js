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
    const templates = { open: await fs.readFile(path.join(dir, "open.html"), "utf-8") };
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
  if (shape.hasOwnLayout) return `layouts/${path.basename(shape.manifest.defaultLayout || `${shape.name}.njk`)}`;
  return objects ? `layouts/${shape.name}.njk` : null;
}

export function generatedLayout(name) {
  return `---\nlayout: layouts/base.njk\n---\n{% bloobObject "${name}", content %}\n`;
}

export async function writeTemplateShapeLayouts(shapes, { objects, layoutsDir }) {
  if (!objects) return [];
  const written = [];
  for (const shape of shapes.values()) {
    if (shape.hasOwnLayout) continue;
    await fs.outputFile(path.join(layoutsDir, `${shape.name}.njk`), generatedLayout(shape.name));
    written.push(`${shape.name}.njk`);
  }
  return written;
}
