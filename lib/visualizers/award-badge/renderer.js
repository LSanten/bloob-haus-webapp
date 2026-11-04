/**
 * award-badge renderer — pure function
 *
 * entries (from parser.parseEntries) + settings → complete HTML string.
 * No JavaScript needed at all: the seal is inline SVG, the label is real text.
 *
 * settings:
 *   style:     "tab" (block for the hero edge) | "seal" (seal + label) | "line" (compact, for cards)
 *   edge:      "wax" (default) | "scallop" | "star" | "circle" | "ribbon"
 *   placement: free word added as a class on the wrapper (award-badges--<placement>)
 */

const STYLES = new Set(["tab", "seal", "line"]);
const EDGES = new Set(["wax", "scallop", "star", "circle", "ribbon"]);
const SEAL_SIZE = { tab: 50, seal: 62, line: 20 };

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

function poly(n, rf) {
  const c = 50;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const r = rf(t, i);
    return `${(c + r * Math.cos(t)).toFixed(2)},${(c + r * Math.sin(t)).toFixed(2)}`;
  }).join(" ");
}

function sealEdge(edge) {
  switch (edge) {
    case "scallop": return `<polygon class="award-seal__wax" points="${poly(180, (t) => 43.5 + 3.4 * Math.abs(Math.cos(t * 9)))}"/>`;
    case "star": return `<polygon class="award-seal__wax" points="${poly(48, (t, i) => (i % 2 ? 41.5 : 48))}"/>`;
    case "circle": return `<circle class="award-seal__wax" cx="50" cy="50" r="46"/><circle class="award-seal__ring" cx="50" cy="50" r="42.5"/>`;
    case "ribbon": return `<path class="award-seal__wax award-seal__tail" d="M38 62 L28 98 L35 93 L40 99 L48 66 Z"/><path class="award-seal__wax award-seal__tail" d="M62 62 L72 98 L65 93 L60 99 L52 66 Z"/><circle class="award-seal__wax" cx="50" cy="44" r="38"/>`;
    default: return `<polygon class="award-seal__wax" points="${poly(120, (t) => 45 + 2.4 * Math.sin(t * 7 + 0.6) + 1.3 * Math.sin(t * 13 + 2.1) + 0.8 * Math.sin(t * 23))}"/>`;
  }
}

export function sealSVG(entry, size, edge = "wax") {
  const c = 50;
  const parts = [];
  if (entry.kind === "award") {
    for (const side of [-1, 1]) {
      parts.push(`<path class="award-seal__stem" d="M${50 + side * 6} 75 A 25 25 0 0 ${side < 0 ? 1 : 0} ${50 + side * 25} 44"/>`);
      for (let k = 0; k < 5; k++) {
        const deg = side < 0 ? 112 + k * 20 : 68 - k * 20;
        const a = (deg * Math.PI) / 180;
        const lx = (c + 27.5 * Math.cos(a)).toFixed(2);
        const ly = (c + 27.5 * Math.sin(a)).toFixed(2);
        parts.push(`<ellipse class="award-seal__ink" cx="${lx}" cy="${ly}" rx="1.7" ry="3.9" transform="rotate(${(deg + side * 40).toFixed(1)} ${lx} ${ly})"/>`);
      }
    }
  }
  let mark;
  if (entry.kind !== "award") {
    mark = `<g transform="rotate(32 50 51)"><path class="award-seal__ink" d="M50 35 C63 42 63 58 50 67 C37 58 37 42 50 35 Z"/><path class="award-seal__vein" d="M50 41 V72"/></g>`;
  } else if (entry.rank) {
    const suffix = ordinal(entry.rank).replace(/^\d+/, "");
    mark = `<text class="award-seal__ink award-seal__num" x="52" y="59" text-anchor="middle" font-size="24">${esc(entry.rank)}<tspan font-size="11" dy="-9">${esc(suffix)}</tspan></text>`;
  } else {
    mark = `<path class="award-seal__ink" d="M50 39 l3.4 7 7.6 1.1 -5.5 5.4 1.3 7.6 -6.8-3.6 -6.8 3.6 1.3-7.6 -5.5-5.4 7.6-1.1z"/>`;
  }
  const inner = `<circle class="award-seal__ring" cx="50" cy="50" r="38"/>${parts.join("")}${mark}`;
  const group = edge === "ribbon" ? `<g transform="translate(50 44) scale(0.82) translate(-50 -50)">${inner}</g>` : inner;
  return `<svg class="award-seal" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${sealEdge(edge)}${group}</svg>`;
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
  const edge = EDGES.has(settings.edge) ? settings.edge : "wax";
  const placement = /^[a-z0-9-]+$/i.test(settings.placement || "") ? ` award-badges--${settings.placement}` : "";

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

  const heading = entries.some((e) => e.kind === "award") ? "Awards" : "Certifications";
  return `<div class="award-badges${placement}"><ul class="award-badge award-badge--${style}" role="list" aria-label="${heading}">${items}</ul></div>`;
}
