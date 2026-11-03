// The visualizer engine: pure functions every host (the site builder, the editor, the post
// office, any web page) uses the same way. See docs/architecture/shapes.md, "Step one".
export { deriveBlanks } from "./blanks.js";
export { fillTemplate, escapeHtml } from "./fill.js";
export { renderObject } from "./render.js";
export { VERSION } from "./version.js";
