/**
 * A room: a folder's pages drawn as their closed objects, in a plain flow. A note shows its tip,
 * a marble its glass, any other page a calm card with its icon. Every object is a real link, so
 * the room works without script; the toolbox makes a click play the opening on arrival.
 *
 * Pure: catalog nodes (graph.json) in, HTML out.
 */
import { escapeHtml } from "./fill.js";

/** The folder's own pages: direct children, listed, not archived. */
export function roomNodes(nodes, folder) {
  const prefix = `/${String(folder).replace(/^\/+|\/+$/g, "")}/`;
  return nodes.filter((n) => {
    if (n.type !== "page" || typeof n.id !== "string" || !n.id.startsWith(prefix) || n.id === prefix) return false;
    if (n.website_status === "archived" || n.redirect) return false;
    return n.id.slice(prefix.length).split("/").filter(Boolean).length === 1;
  });
}

/** The pages a list of addresses names, in its order (a tag's pages, a hand-picked set). */
export function nodesForUrls(nodes, urls) {
  const byId = new Map(nodes.filter((n) => n.type === "page").map((n) => [n.id, n]));
  return (urls || []).map((u) => byId.get(u)).filter(Boolean);
}

const title = (n) => `<span class="room-object__title">${escapeHtml(n.title ?? "")}</span>`;

function marble(n) {
  const picture = n.closedPicture
    ? `<span class="room-object__ball"><img class="room-object__glass no-optimize" src="${escapeHtml(n.closedPicture.replace(/\.png$/, "-256.png"))}" alt="" width="256" height="256" loading="lazy" decoding="async"><span class="room-object__shine" aria-hidden="true"></span></span>`
    : `<span class="room-object__ball"><span class="room-object__glass" style="background:${/^#[0-9a-f]{6}$/i.test(n.color || "") ? n.color : "#c9b8e8"}"></span><span class="room-object__shine" aria-hidden="true"></span></span>`;
  const sub = n.subtitle ? `<span class="room-object__sub room-object__sub--marble">${escapeHtml(n.subtitle)}</span>` : "";
  return `<a class="room-object room-object--marble" href="${escapeHtml(n.id)}">${picture}${title(n)}${sub}</a>`;
}

function note(n) {
  const lines = n.firstLines ? `<span class="room-object__lines">${escapeHtml(n.firstLines)}</span>` : "";
  return `<a class="room-object room-object--note" href="${escapeHtml(n.id)}"><span class="room-object__paper">${title(n)}${lines}</span></a>`;
}

function card(n) {
  const icon = n.bloobIcon ? `<img class="room-object__icon no-zoom" src="${escapeHtml(n.bloobIcon)}" alt="" width="28" height="28" loading="lazy">` : "";
  const sub = n.subtitle ? `<span class="room-object__sub">${escapeHtml(n.subtitle)}</span>` : "";
  return `<a class="room-object room-object--card" href="${escapeHtml(n.id)}">${icon}<span>${title(n)}${sub}</span></a>`;
}

const DRAW = { marble, note };

/**
 * @param {object[]} nodes  catalog nodes, already chosen for this room
 * @param {Map<string, object>} shapes  the template shapes; a page whose kind isn't one is a card
 */
export function renderRoom(nodes, shapes) {
  const objects = nodes.map((n) => (shapes.has(n.shape) && DRAW[n.shape] ? DRAW[n.shape](n) : card(n)));
  return `<div class="room" data-pagefind-ignore>${objects.join("")}</div>`;
}
