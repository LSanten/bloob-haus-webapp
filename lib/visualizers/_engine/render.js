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
const SWITCHES = ["opens", "remembers", "arrives", "shares", "pace", "assembles"];

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
    ["class", `bloob-object bloob-object--${shape.name}`],
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

  const shareRow = outermost && shape.manifest?.shares ? renderShareRow(outside, insideBlanks) : "";
  return `<div ${attrs.map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(" ")}>${closedPart}${shareRow}${openPart}</div>`;
}

// The outermost object's share row: small buttons collapsed together, opened by the toolbox's
// share.js. Hidden until script runs (engine.css), since every button needs it.
const ICON = (d) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SHARE_BUTTONS = [
  ["link", "Copy link", ICON('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>')],
  ["share", "Share", ICON('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>')],
  ["markdown", "Copy markdown", ICON('<path d="M4 6h16v12H4z"/><path d="M7 15V9l2.5 3L12 9v6"/><path d="M17 9v6l-2-2m2 2 2-2"/>')],
  ["image", "Copy image", ICON('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>')],
  ["pdf", "Save as PDF", ICON('<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>')],
];
// The row carries what "copy image" draws on its card: the outside words, and the first lines
// only while the object is open to read.
function renderShareRow(outside, insideBlanks) {
  const card = [
    ["data-title", outside.title],
    ["data-subtitle", outside.subtitle],
    ["data-lines", insideBlanks?.firstLines],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join("");
  const buttons = SHARE_BUTTONS.map(
    ([action, label, icon]) =>
      `<button type="button" class="bloob-share__btn" data-share-action="${action}" aria-label="${label}">${icon}<span class="bloob-share__label">${label}</span></button>`,
  ).join("");
  return `<div class="bloob-share" data-pagefind-ignore${card}>${buttons}</div>`;
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
