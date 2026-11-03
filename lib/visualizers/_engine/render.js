/**
 * Draws one object: a note, a marble, an article. The HTML holds the closed part and the open
 * part; it starts open, so without script everything can be read. The browser toolbox
 * (toolbox.js) closes and opens it, driving --open from 0 to 1.
 *
 * Pure: no files, no DOM, no network.
 */

import { deriveBlanks } from "./blanks.js";
import { fillTemplate, escapeHtml } from "./fill.js";

// Manifest switches carried to the toolbox as data attributes, one to one.
const SWITCHES = ["opens", "remembers", "arrives", "shares"];

/**
 * @param {{ name: string, manifest: object, templates: { open: string, closed?: string } }} shape
 * @param {{ data: object, html: string, url: string, pageId: string }} note
 * @param {{ locked?: boolean, sealed?: boolean, inside?: string | null, outermost?: boolean }} [opts]
 * @returns {string}
 */
export function renderObject(shape, note, { locked = false, sealed = false, inside = null, outermost = true } = {}) {
  const { outside, inside: insideBlanks } = deriveBlanks(note, { locked, sealed });
  const outsideOnly = !insideBlanks;

  const attrs = [
    ["class", "bloob-object"],
    ["data-shape", shape.name],
    ["data-page-id", note.pageId],
    ["data-state", outsideOnly ? "closed" : "open"],
    ...SWITCHES.filter((key) => shape.manifest?.[key] !== undefined && shape.manifest[key] !== false)
      .filter((key) => key !== "shares" || outermost)
      .map((key) => [`data-${key}`, shape.manifest[key]]),
    ["style", `--open:${outsideOnly ? 0 : 1}`],
  ];

  const closedPart = renderClosedPart(shape, outside, insideBlanks);
  const openPart = outsideOnly
    ? ""
    : `<div class="bloob-object__open">${fillTemplate(shape.templates.open, { ...outside, ...insideBlanks, inside: inside ?? "" })}</div>`;

  return `<div ${attrs.map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(" ")}>${closedPart}${openPart}</div>`;
}

// The closed part receives outside blanks only. First lines and a body image count as outside
// only while the note is open to read; the body itself never reaches it.
function renderClosedPart(shape, outside, insideBlanks) {
  const blanks = {
    ...outside,
    image: outside.image ?? insideBlanks?.image,
    firstLines: insideBlanks?.firstLines,
    body: undefined,
    inside: undefined,
  };
  if (shape.templates.closed) {
    return `<div class="bloob-object__closed">${fillTemplate(shape.templates.closed, blanks)}</div>`;
  }
  if (!insideBlanks) {
    // A tip-style object whose inside can't be read: a quiet look with only its title.
    return `<div class="bloob-object__closed"><p class="bloob-object__title">${escapeHtml(outside.title ?? "")}</p></div>`;
  }
  return "";
}
