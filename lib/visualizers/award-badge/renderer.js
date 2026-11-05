/**
 * award-badge renderer — pure function
 *
 * entries (from parser.parseEntries) + settings → complete HTML string.
 * No JavaScript needed: the seal is inline SVG, the label is real text.
 *
 * Two seal kinds, both carrying the short name (first word of NAME) inside the icon,
 * so an icon alone still says what it is (used on project cards):
 *   award  → rosette with ribbon tails: "ASHRAE", and "1st" (or the year) under it
 *   cert   → round plaque with a dotted rim: "LEED", and the level ("GOLD") under it
 *
 * settings:
 *   style:     "tab" (block for a hero edge) | "seal" (seal + label) | "line" (compact)
 *              | "icon" (seals only, for cards)
 *   edge:      award outline: "ribbon" (default) | "wax" | "scallop" | "star" | "circle"
 *   placement: free word added as a class on the wrapper (award-badges--<placement>)
 */

const STYLES = new Set(["tab", "seal", "line", "icon"]);
const EDGES = new Set(["ribbon", "wax", "scallop", "star", "circle"]);
const SEAL_SIZE = { tab: 60, seal: 66, line: 26, icon: 62 };

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ordinal(n) {
  n = Number(n);
  const t = n % 100;
  return n + (t > 10 && t < 14 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}

/** The word shown inside the icon: the first word of NAME ("ASHRAE", "LEED", "GreenPoint"). */
export function shortName(entry) {
  return String(entry.name || "").trim().split(/\s+/)[0] || "";
}

function poly(n, cx, cy, rf) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = rf(t, i);
    return `${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`;
  }).join(" ");
}

/** Text that never overflows the seal: long words are squeezed to `max` units. */
function fitText(word, { x, y, size, max, cls, perChar }) {
  const natural = word.length * perChar * size;
  const fit = natural > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : "";
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle" font-size="${size}"${fit}>${esc(word)}</text>`;
}

function awardOutline(edge) {
  switch (edge) {
    case "wax":
      return { cy: 50, r: 36, shape: `<polygon class="award-seal__wax" points="${poly(120, 50, 50, (t) => 45 + 2.4 * Math.sin(t * 7 + 0.6) + 1.3 * Math.sin(t * 13 + 2.1) + 0.8 * Math.sin(t * 23))}"/>` };
    case "scallop":
      return { cy: 50, r: 37, shape: `<polygon class="award-seal__wax" points="${poly(180, 50, 50, (t) => 43.5 + 3.4 * Math.abs(Math.cos(t * 9)))}"/>` };
    case "star":
      return { cy: 50, r: 36, shape: `<polygon class="award-seal__wax" points="${poly(48, 50, 50, (t, i) => (i % 2 ? 41.5 : 48))}"/>` };
    case "circle":
      return { cy: 50, r: 38, shape: `<circle class="award-seal__wax" cx="50" cy="50" r="46"/>` };
    default: // ribbon: rosette + two notched tails
      return {
        cy: 40,
        r: 28.5,
        shape:
          `<path class="award-seal__tail" d="M39 58 L29 97 L36.5 92 L41.5 98.5 L49 63 Z"/>` +
          `<path class="award-seal__tail" d="M61 58 L71 97 L63.5 92 L58.5 98.5 L51 63 Z"/>` +
          `<polygon class="award-seal__wax" points="${poly(160, 50, 40, (t) => 34 + 2.8 * Math.abs(Math.cos(t * 10)))}"/>`,
      };
  }
}

export function awardSVG(entry, size, edge = "ribbon") {
  const { cy, r, shape } = awardOutline(edge);
  const name = shortName(entry);
  const sub = entry.rank ? ordinal(entry.rank) : entry.year || "";
  const nameY = sub ? cy + 1.5 : cy + 5;
  return `<svg class="award-seal award-seal--award" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${shape}<circle class="award-seal__ring" cx="50" cy="${cy}" r="${r}"/>${fitText(name, { x: 50, y: nameY, size: 15, max: 44, cls: "award-seal__ink award-seal__name", perChar: 0.68 })}${sub ? fitText(sub, { x: 50, y: cy + 14, size: 10.5, max: 30, cls: "award-seal__ink award-seal__sub", perChar: 0.6 }) : ""}</svg>`;
}

export function plaqueSVG(entry, size) {
  const name = shortName(entry);
  const level = String(entry.level || "").toUpperCase();
  const dots = Array.from({ length: 30 }, (_, i) => {
    const t = (i / 30) * Math.PI * 2;
    return `<circle class="award-seal__ink" cx="${(50 + 40 * Math.cos(t)).toFixed(2)}" cy="${(50 + 40 * Math.sin(t)).toFixed(2)}" r="1.15"/>`;
  }).join("");
  const levelCls = level ? ` award-seal--level-${level.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";
  return `<svg class="award-seal award-seal--plaque${levelCls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="award-seal__wax" cx="50" cy="50" r="47"/><circle class="award-seal__ring" cx="50" cy="50" r="44"/>${dots}<circle class="award-seal__ring" cx="50" cy="50" r="35.5"/>${fitText(name, { x: 50, y: level ? 52 : 57, size: 19, max: 52, cls: "award-seal__ink award-seal__name", perChar: 0.66 })}${level ? `<path class="award-seal__rule" d="M36 57.5 H64"/>${fitText(level, { x: 50, y: 67, size: 8.5, max: 44, cls: "award-seal__ink award-seal__sub", perChar: 0.72 })}` : ""}</svg>`;
}

export function sealSVG(entry, size, edge) {
  return entry.kind === "award" ? awardSVG(entry, size, edge) : plaqueSVG(entry, size);
}

export function entryText(e) {
  if (e.kind === "award") {
    const place = e.rank ? `${ordinal(e.rank)} Place` : e.place;
    return [e.name, [e.level, e.year, place].filter(Boolean).join(" · ")];
  }
  return [[e.name, e.level].filter(Boolean).join(" "), e.year ? `Certified ${e.year}` : ""];
}

/**
 * @param {object[]} entries
 * @param {{ style?: string, edge?: string, placement?: string }} [settings]
 * @returns {string}
 */
export function render(entries, settings = {}) {
  if (!entries || !entries.length) return "";
  const style = STYLES.has(settings.style) ? settings.style : "tab";
  const edge = EDGES.has(settings.edge) ? settings.edge : "ribbon";
  const placement = /^[a-z0-9-]+$/i.test(settings.placement || "") ? ` award-badges--${settings.placement}` : "";
  const heading = entries.some((e) => e.kind === "award") ? "Awards" : "Certifications";

  if (style === "icon") {
    // Cards: seals only. The card is already a link, so no nested links here.
    const icons = entries
      .map((e) => {
        const label = entryText(e).filter(Boolean).join(", ");
        return `<li class="award-badge__icon" title="${esc(label)}"><span class="award-badge__sr">${esc(label)}</span>${sealSVG(e, SEAL_SIZE.icon, edge)}</li>`;
      })
      .join("");
    return `<div class="award-badges${placement}"><ul class="award-badge award-badge--icon" role="list" aria-label="${heading}">${icons}</ul></div>`;
  }

  const items = entries
    .map((e) => {
      const [a, b] = entryText(e);
      const label = [a, b].filter(Boolean).join(", ");
      const inner = `${sealSVG(e, SEAL_SIZE[style], edge)}<span class="award-badge__name"><span class="award-badge__title">${esc(a)}</span>${b ? `<span class="award-badge__sub">${esc(b)}</span>` : ""}</span>`;
      return e.link
        ? `<li><a class="award-badge__item award-badge__link" href="${esc(e.link)}" aria-label="${esc(label)}">${inner}</a></li>`
        : `<li class="award-badge__item" aria-label="${esc(label)}">${inner}</li>`;
    })
    .join("");

  return `<div class="award-badges${placement}"><ul class="award-badge award-badge--${style}" role="list" aria-label="${heading}">${items}</ul></div>`;
}
