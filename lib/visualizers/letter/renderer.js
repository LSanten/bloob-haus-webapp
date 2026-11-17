// @ts-check
/**
 * renderer.js — the letter's envelope, drawn in glassine (2026-11-12): a see-through envelope
 * with one thin line, a perforated stamp, a postmark, and the outside typed on it. Pure: envelope
 * in, HTML string out; no DOM, no files, no imports. Its look lives in styles.css beside this file.
 *
 * THIS FILE'S HOME IS bloob-haus-webapp/lib/visualizers/letter/ (one home for drawing code,
 * 2026-11-16). The post office (bloob-haus-cloud) carries a copy that its deploy refreshes; edit it
 * here, never there. It was born in the cloud as app/src/shapes/letter/closed.ts. Keep it free of
 * anything only one host has, so the copy works as it is.
 *
 * Drawn by a server (the post office's gate, link previews, a locker's spine), by a browser (the
 * tear) and by the visualizer editor. Design page: https://claude.ai/artifact/9G2843mxE3i5RzhR4mMjwh
 * (private to Leon).
 *
 * Same envelope, same picture, including the shape of its tear: every letter tears its own way,
 * always the same way, because the tear is seeded from the envelope itself.
 */

/**
 * The outside of a letter: its frontmatter, flat, every value a string. The writer's own keys
 * (to, from, timing, intention, need, anything else), the day it was written (date_created), and
 * the marks a post office stamps on the served copy (date_postmarked, fetched, opened).
 * @typedef {Record<string, string>} Envelope
 */
/**
 * The inside of a letter, for a host that already holds it opened (the reader's browser, after
 * unsealing; an editor, where nothing is sealed). Optional everywhere, and only ever drawn on the
 * paper that shows once the envelope is torn open: a sealed face and the link preview's picture
 * never take it, so a server with no key draws exactly what it always drew.
 *  - html:  the paper's words, already safe HTML (paper.js renderPaperBody). The peeking paper then
 *           carries the letter's beginning, set like the top of the open sheet, and is as long as
 *           the letter is, up to the envelope's height.
 *  - lines: without words, about how many lines the letter has, so the blank paper is that long.
 * @typedef {{ html?: string, lines?: number }} Inside
 */
/** @typedef {[number, number]} Pt */
/** A line of the outside: an optional muted label ("to:") and what the writer wrote. @typedef {{ label?: string, text: string }} Said */
/** @typedef {{ k?: boolean, t: string }} Part */
/** @typedef {{ y: number, x: number, parts: Part[] }} Line */

/** Keys drawn in their own places above, or never drawn: the machinery and the post office's marks. */
const PLACED = new Set(["to", "from", "date_created", "date_postmarked", "timing", "stamp", "intention", "need", "fetched", "opened", "bloob-shape"]);
// `bloob-*` is the system's own bookkeeping (bloob-shape, and bloob-copied-from on letters from the
// copy-on-reply era): sealed into old letters, never something the writer said.
/** @param {string} k */
const hidden = (k) => PLACED.has(k) || k.startsWith("sealed-") || k.startsWith("mark_") || k.startsWith("bloob");

/** How many taps tear a letter open (U17). The host counts them; this only draws them. */
export const TEARS = 3;

/** Own timing words that still fit on the stamp; longer ones are typed on the envelope instead. */
const STAMP_WORDS_MAX = 30;

/** @param {string} s @returns {string} */
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** @param {number} n */
const f1 = (n) => n.toFixed(1);

/** A small seeded random, so the tear is part of the envelope and not of the moment. @param {Envelope} env @returns {number} */
function seedOf(env) {
  const s = [env.to, env.from, env.date_created, env["sealed-id"]].join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** @param {number} seed @returns {() => number} */
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The flap lines every envelope carries, for a builder that draws the envelope it is writing on. */
export const FLAP_LINES = `<svg class="bh-env__lines" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">` +
  `<path class="flap" d="M0 0 L160 112 L320 0"></path><path class="flap" d="M0 200 L134 98 M320 200 L186 98"></path>` +
  `<path class="fiber-soft" d="M16 150 C 70 138, 124 160, 196 146 M206 186 C 236 176, 268 184, 306 170 M40 50 C 60 70, 66 88, 98 98"></path></svg>`;

/**
 * The tear along the top: 41 points across the 320-wide envelope, about 20 down, with fibers.
 * @param {Envelope} env
 * @returns {{ pts: Pt[], fibers: [number, number, number, number][] }}
 */
function tearOf(env) {
  const r = rng(seedOf(env)), ph = r() * 6;
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push([i * 8, 19 + Math.sin(i * 0.45 + ph) * 2.2 + Math.sin(i * 1.6 + ph * 2) * 1.1 + (r() - 0.5) * 2.6]);
  /** @type {[number, number, number, number][]} */
  const fibers = [];
  pts.forEach((p, i) => {
    // A fiber ends inside the envelope's width: the first one used to poke out past its left side
    // (Leon, 2026-11-15). Clamped after drawing the random, so every other fiber stays where it was.
    const inside = (/** @type {number} */ x) => Math.min(320, Math.max(0, x));
    if (i % 2 === 0) fibers.push([p[0], p[1], inside(p[0] + (r() - 0.5) * 6), p[1] - 2 - r() * 4]);
    if (i % 3 === 1) fibers.push([p[0], p[1], inside(p[0] + (r() - 0.5) * 5), p[1] + 1.5 + r() * 3]);
  });
  return { pts, fibers };
}

/**
 * Everything above the tear goes: the envelope is clipped along it (and 24px out, for the halo).
 * Heights in cqi, not %, so the tear stays the same strip along the top when an envelope with a
 * lot written on it grows taller (62.5cqi is the envelope's height at its 320:200 shape).
 * @param {Pt[]} pts
 * @returns {string}
 */
function clipAlong(pts) {
  const out = pts.map((p, i) => {
    const x = i === 0 ? "-24px" : i === pts.length - 1 ? "calc(100% + 24px)" : `${(p[0] / 3.2).toFixed(2)}%`;
    return `${x} ${(p[1] * 0.3125 - 0.25).toFixed(2)}cqi`;
  });
  return `polygon(${[...out, "calc(100% + 24px) calc(100% + 24px)", "-24px calc(100% + 24px)"].join(", ")})`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** @param {Envelope} env @returns {string} */
function postmark(env) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(env.date_postmarked ?? "");
  if (!m) return "";
  const id = `bh-pm-${seedOf(env).toString(36)}`;
  // The ring on the stamp's lower corner, its wavy lines trailing off to the right like a real
  // cancellation, clear of the stamp's words and of what is typed on the left.
  return `<svg class="bh-env__postmark bh-postmark" viewBox="0 0 120 60" role="img" aria-label="Postmarked ${m[1]}-${m[2]}-${m[3]}">` +
    `<path class="wave" d="M50 20 q 6 -4 12.5 0 t 12.5 0 t 12.5 0 t 12.5 0 M50 28 q 6 -4 12.5 0 t 12.5 0 t 12.5 0 t 12.5 0 M50 36 q 6 -4 12.5 0 t 12.5 0 t 12.5 0 t 12.5 0 M50 44 q 6 -4 12.5 0 t 12.5 0 t 12.5 0 t 12.5 0"></path>` +
    `<circle cx="24" cy="30" r="24"></circle><circle cx="24" cy="30" r="15.5"></circle>` +
    `<path id="${id}" class="arc" d="M 4.5 30 a 19.5 19.5 0 0 1 39 0"></path>` +
    `<text class="ring"><textPath href="#${id}" startOffset="50%">BLOOB HAUS POST</textPath></text>` +
    `<text class="day" x="24" y="29">${+m[3]} ${MONTHS[+m[2] - 1]}</text><text class="year" x="24" y="36.5">${m[1]}</text></svg>`;
}

/**
 * The stamp carries the timing (Leon, 2026-11-12: "the no rush, open whenever stamp … the way they
 * used to exist in the realistic mockup", the 2026-11-04 draft): a moon for no rush, a sun for
 * please open soon, the writer's own words under a heart. No timing: the plain stamp, a leaf.
 * Drawn in lines; its words are in its accessible name too, since the picture is not text.
 */
const PIC = {
  leaf: "M28 44 C 17 35, 17 21, 28 13 C 39 21, 39 35, 28 44 Z M28 44 L28 17 M28 26 L23 22 M28 33 L33 29",
  moon: "M33 12 A 13 13 0 1 0 38 35 A 10.5 10.5 0 1 1 33 12 Z",
  sun: "M28 19.5 m -6.5 0 a 6.5 6.5 0 1 0 13 0 a 6.5 6.5 0 1 0 -13 0 M28 6.5 L28 9.5 M28 29.5 L28 32.5 M15 19.5 L18 19.5 M38 19.5 L41 19.5 M18.8 10.3 L20.9 12.4 M35.1 26.6 L37.2 28.7 M18.8 28.7 L20.9 26.6 M35.1 12.4 L37.2 10.3",
  heart: "M28 36 C 14 27, 14 15, 21.5 13.5 C 25 13, 27 15, 28 17.5 C 29 15, 31 13, 34.5 13.5 C 42 15, 42 27, 28 36 Z",
};
/** @type {Record<string, { pic: keyof typeof PIC, words: string[], sub: string }>} */
const PRESET_STAMP = {
  "no-rush": { pic: "moon", words: ["NO RUSH"], sub: "open whenever" },
  "please-open-soon": { pic: "sun", words: ["OPEN SOON"], sub: "please" },
};
/** Words onto at most three short lines, whole words only. @param {string} text @returns {string[]} */
function stampLines(text) {
  /** @type {string[]} */
  const out = [];
  for (const w of text.trim().split(/\s+/)) {
    const last = out.length - 1;
    if (last >= 0 && (out[last] + " " + w).length <= 12) out[last] += " " + w; else out.push(w);
  }
  return out;
}
/** The stamp alone: the timing drawn (a builder shows it while the writer chooses). @param {string | undefined} timing @returns {string} */
export function renderStamp(timing) { return stamp(timing); }

/**
 * The envelope's paper itself: flap lines and the stamp (its grain is the look's, in styles.css). ONE function, drawn by renderClosed
 * and by the builder (EnvelopeWriter), so the envelope being written on and the envelope that
 * arrives are the same drawing by construction, not by two copies kept alike (triage 4589062a:
 * "ideally use the same visualization engine for the builder GUI as for the finished object").
 * `extra` is what only a sent letter has drawn into the paper (the tear's strip).
 * @param {number} seed
 * @param {string | undefined} timing
 * @returns {string}
 */
export function renderEnvelopePaper(seed, timing) { return frame(seed, timing, ""); }
/** @param {number} seed @param {string | undefined} timing @param {string} extra @returns {string} */
function frame(seed, timing, extra) {
  return FLAP_LINES + extra + stamp(timing);
}

/** @param {string | undefined} timing @returns {string} */
function stamp(timing) {
  const preset = timing && Object.hasOwn(PRESET_STAMP, timing) ? PRESET_STAMP[timing] : null;
  const own = !preset && timing && timing.length <= STAMP_WORDS_MAX ? timing : "";
  const pic = preset ? preset.pic : own ? "heart" : "leaf";
  const words = preset ? preset.words : own ? stampLines(own) : [];
  const sub = preset?.sub ?? "";
  const label = preset ? `A stamp: ${preset.words.join(" ").toLowerCase()}, ${sub}` : own ? `A stamp: ${own}` : "A stamp";
  const size = own ? (words.length > 1 || own.length > 10 ? 5.6 : 7) : words.join(" ").length > 7 ? 5.8 : 7;
  const y0 = 48 - (words.length - 1) * (size + 1) - (sub ? 4 : 0);
  const text = words.map((w, i) => `<text class="words" x="28" y="${f1(y0 + i * (size + 1))}" font-size="${size}">${esc(w)} </text>`).join("") +
    (sub ? `<text class="sub" x="28" y="${f1(y0 + words.length * (size + 1) + 0.5)}">${esc(sub)}</text>` : "");
  return `<svg class="bh-env__stamp bh-stamp${words.length ? " bh-stamp--words" : ""}" viewBox="0 0 56 68" role="img" aria-label="${esc(label)}">` +
    `<rect class="perf" x="2" y="2" width="52" height="64"></rect><rect class="hair" x="7.5" y="7.5" width="41" height="53"></rect>` +
    `<path class="pic" d="${PIC[pic]}"${words.length ? ` transform="translate(${f1(28 * 0.2)} 0) scale(0.8)"` : ""}></path>${text}</svg>`;
}

/**
 * Everything this needs is in the envelope's own YAML — that is the rule: the file is the object,
 * and looking at it is enough to know its state, the way looking at a real letter is.
 * A host that holds the opened letter may also pass its inside (see Inside): it shows only on the
 * paper of an envelope that is already open, never on a sealed one.
 * @param {Envelope} env
 * @param {Inside} [inside]
 * @returns {string}
 */
export function renderClosed(env, inside) {
  return draw(env, env.opened ? TEARS : 0, inside);
}

/**
 * The frames between closed and open (U17): the same envelope, torn `tears` of TEARS of the way
 * along its top, left to right. Pure, like renderClosed. A transition, not a state: nothing about
 * the letter changes until the host's last tap actually opens it, so this never says "opened".
 * The last frame lets the torn strip float away (styles.css animates it once, on arrival).
 * @param {Envelope} env
 * @param {number} tears
 * @param {Inside} [inside]
 * @returns {string}
 */
export function renderTearing(env, tears, inside) {
  return draw(env, Math.min(Math.max(tears, 0), TEARS), inside);
}

/**
 * The other side of the same envelope (2026-11-15, the letter that turns): what you see when you
 * turn it over. Pure, like renderClosed, and in the same state: sealed, torn `tears` of the way, or
 * opened, read from the envelope unless a tear in progress is passed in.
 *
 * A real back, not the front seen through the paper (Leon, 2026-11-15: "it should have a different
 * back. and maybe read bloob haus encrypted post office"): the flap lying on the body, two layers
 * of glassine and so a touch more opaque; the seams of the pocket; a small seal with a lock where
 * the flap closes; and the office's own line along the bottom. Nothing of the writer's is on it.
 * A picture only (aria-hidden): the front has the words for the ear.
 */
export const BACK_WORDS = "bloob haus \u00b7 encrypted post office";
/**
 * @param {Envelope} env
 * @param {number} [tears] how far it is torn; read from the envelope when left out
 * @param {Inside} [inside] only so the paper is as long as on the front; its words face the front and are not shown here
 * @returns {string}
 */
export function renderBack(env, tears = env.opened ? TEARS : 0, inside) {
  const p = pieces(env, Math.min(Math.max(tears, 0), TEARS), inside);
  const mirrored = p.tear.pts.map((q) => /** @type {Pt} */ ([320 - q[0], q[1]])).reverse();
  const clip = p.done ? ` style="clip-path:${clipAlong(mirrored)}"` : "";
  // No `envelope` classes here: those name the letter itself, once, and that is its front.
  return `<figure class="bh-env bh-env--back" data-state="${p.opened ? "opened" : p.t > 0 ? "tearing" : "sealed"}" data-tears="${p.t}" aria-hidden="true">${p.peek}` +
    `<div class="bh-env__body"${clip}>` +
    `<svg class="bh-env__lines bh-env__lines--back" viewBox="0 0 320 200" preserveAspectRatio="none">` +
    `<path class="flap-paper" d="M0 0 L160 112 L320 0 Z"></path><path class="flap" d="M0 0 L160 112 L320 0"></path>` +
    `<path class="seam" d="M0 200 L134 98 M320 200 L186 98"></path></svg>` +
    p.rip.replace(`class="bh-env__rip"`, `class="bh-env__rip bh-env__rip--back"`) +
    `<svg class="bh-env__seal" viewBox="0 0 40 40"><circle class="disc" cx="20" cy="20" r="15"></circle><circle class="ring" cx="20" cy="20" r="11.6"></circle>` +
    `<path class="lock" d="M14.5 19 h11 v8 h-11 Z M16.8 19 v-2.6 a3.2 3.2 0 0 1 6.4 0 v2.6 M20 22.2 v2"></path></svg>` +
    `<p class="bh-env__office">${esc(BACK_WORDS)}</p>` +
    `</div></figure>`;
}

/** Everything both sides are drawn from: one reading of the envelope, so they cannot disagree. @param {Envelope} env @param {number} t @param {Inside} [inside] */
function pieces(env, t, inside) {
  const opened = Boolean(env.opened);
  const tearing = !opened && t > 0;
  const done = t >= TEARS;
  // No dates are typed on the outside (Leon, 2026-11-12): the day it was sent is the postmark's, and
  // the day it was written belongs to the letter inside, at the top of the paper (Steph's two dates). Only what the writer filled in is drawn, and all of it (Leon, 2026-11-12: in
  // the locker "I should be able to read the other things on the letter"): long lines wrap and the
  // envelope grows, nothing is cut to "…" or counted away.
  const timing = env.timing ?? env.stamp;   // `stamp` is the name before 2026-09-24
  const { said, who } = outsideWords(env, timing);
  // Whether it is sealed, being torn, or opened shows in the drawing itself (the whole flap, the
  // tear, the paper peeking out), so the words are for screen readers only (Leon, 2026-11-12:
  // "I can just see visually that a letter has been opened"; everything seen has words for the ear).
  const status = opened ? "opened" : tearing ? (done ? "torn open" : "tearing open") : "sealed, not opened yet";
  const cls = opened ? "opened" : tearing ? "sealed envelope-tearing" : "sealed";

  const tear = tearOf(env);
  const upto = (320 * t) / TEARS;
  const along = tear.pts.filter((p) => p[0] <= upto + 0.01);
  const tearLine = t > 0 && along.length > 1 ? `<path class="tear" d="M${along.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(" L")}"></path>` : "";
  const fibers = t > 0 ? tear.fibers.filter((f) => f[0] <= upto).map((f) => `<line class="fiber" x1="${f1(f[0])}" y1="${f1(f[1])}" x2="${f1(f[2])}" y2="${f1(f[3])}"></line>`).join("") : "";
  const rip = t > 0 ? `<svg class="bh-env__rip" viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true">${tearLine}${fibers}</svg>` : "";
  // Torn all the way, or opened: the paper peeks out above the torn edge (from the last tear on,
  // 2026-11-15, so the paper that is then taken out is already there to be seen). Blank, because
  // this is drawn without a key.
  // this is drawn without a key; a host that holds the opened letter passes its inside (peekOf).
  const peek = opened || done ? peekOf(env, inside) : "";
  const drawing = face(env, said, who, timing, false);
  return { t, opened, done, status, cls, tear, peek, rip, drawing };
}

/**
 * The paper in the envelope: blank and short when nothing is known of the inside (the default, and
 * all a server can draw); as long as the letter when the host says how long; and with the letter's
 * beginning on it, set as a small copy of the open sheet's top, when the host holds the words.
 * The words are real text. They sit under the envelope's body, so above the torn edge they are
 * crisp and below it they show through the glassine, as the paper itself does.
 * @param {Envelope} env
 * @param {Inside} [inside]
 * @returns {string}
 */
function peekOf(env, inside) {
  if (inside?.html) {
    const date = env.date_created ? `<p class="bh-paper__date">${esc(env.date_created)}</p>` : "";
    return `<div class="bh-env__peek bh-env__peek--paper"><div class="bh-env__sheet">${date}<div class="note-body bh-paper__body">${inside.html}</div></div></div>`;
  }
  const lines = Number(inside?.lines);
  // the sheet's top and bottom margins plus its lines, in the envelope's own cqi (see styles.css)
  const long = lines > 0 ? ` style="--bh-peek-h:${f1(Math.max(PEEK_MIN, 10.8 + lines * 3.8))}cqi"` : "";
  return `<div class="bh-env__peek"${long} aria-hidden="true"></div>`;
}
/** The shortest a paper of known length is drawn, in cqi: it still reaches into the envelope. */
const PEEK_MIN = 16;

/** @param {Envelope} env @param {number} t @param {Inside} [inside] @returns {string} */
function draw(env, t, inside) {
  const p = pieces(env, t, inside);
  const clip = p.done ? ` style="clip-path:${clipAlong(p.tear.pts)}"` : "";
  const ghost = p.done && !p.opened
    ? `<svg class="bh-env__ghost" viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0 L320 0 ${p.tear.pts.slice().reverse().map((q) => `L${f1(q[0])} ${f1(q[1])}`).join(" ")} Z"></path></svg>`
    : "";
  return `<figure class="bh-env envelope envelope-${p.cls}" data-tears="${p.t}">${p.peek}` +
    `<div class="bh-env__body bh-env__body--drawn"${clip}>${p.drawing}${p.rip}<p class="bh-env__status">A letter, ${p.status}.</p></div>${ghost}</figure>`;
}

/*
 * The outside as ONE SVG (Leon, 2026-11-15: "ideally I just want to work with the same visualizer").
 * The page draws it, and so does a picture printer with no browser (resvg, the link preview), so
 * the preview IS the letter. Words are real SVG text: people can select them and screen readers
 * read them; decoration is aria-hidden, the stamp and postmark are labelled images.
 * Everything is measured in the envelope's own 320 units, so it is one drawing at every size
 * (ui-principles #5). Words wrap by counting characters, exact because the font is monospaced
 * (0.6 em advance), and the envelope grows instead of cutting anything to "…".
 */
const W = 320, PAD_L = 22.4, PAD_R = 19.2, PAD_T = 28.8, PAD_B = 16, GAP = 8;
const SAID_FS = 11.04, SAID_LH = 16.56, WHO_FS = 11.52, WHO_LH = 15.55, ADV = 0.6;
const STAMP_COL = 97.6, STAMP_ZONE = 107.2;   // the stamp and postmark's corner, kept clear of words

/**
 * Words onto lines of at most `max(lineIndex)` characters; a word longer than a line is broken.
 * @param {Said[]} items
 * @param {(n: number) => number} max
 * @param {string} sep
 * @returns {Part[][]}
 */
function wrap(items, max, sep) {
  /** @type {Part[][]} */
  const lines = [];
  for (const it of items) {
    /** @type {Part[]} */
    let line = [];
    let len = 0;
    /** @type {Part[]} */
    const words = [
      ...(it.label ? [{ k: true, t: it.label }] : []),
      ...it.text.split(/\s+/).filter(Boolean).map((t) => ({ t })),
    ];
    for (let w of words) {
      for (;;) {
        const room = max(lines.length) - len - (len ? 1 : 0);
        if (w.t.length <= room) { line.push(len ? { ...w, t: " " + w.t } : w); len += (len ? 1 : 0) + w.t.length; break; }
        // a line ends between words with a space, so copied text and a screen reader keep the words apart
        if (len) { lines.push([...line, { t: " " }]); line = []; len = 0; continue; }
        const cut = Math.max(1, max(lines.length));
        line.push({ ...w, t: w.t.slice(0, cut) }); lines.push(line); line = []; len = 0;
        w = { ...w, t: w.t.slice(cut) };
        if (!w.t) break;
      }
    }
    if (line.length) lines.push(line);
    if (sep && lines.length) lines[lines.length - 1].push({ t: "" });
  }
  return lines;
}

/** @param {Said[]} said @param {Said[]} who @returns {{ h: number, said: Line[], who: Line[] }} */
function layout(said, who) {
  const full = Math.floor((W - PAD_L - PAD_R) / (SAID_FS * ADV));
  const narrow = Math.floor((W - PAD_L - PAD_R - STAMP_COL) / (SAID_FS * ADV));
  const saidLines = wrap(said, (n) => (n * SAID_LH < STAMP_ZONE ? narrow : full), "");
  const whoFull = Math.floor((W - PAD_L - PAD_R) / (WHO_FS * ADV));
  // to and from share a line when both fit, three spaces apart; otherwise each its own
  const joined = who.map((w) => (w.label ? w.label.length + 1 : 0) + w.text.length).reduce((a, b) => a + b, 0) + (who.length - 1) * 3;
  const whoLines = who.length > 1 && joined <= whoFull
    ? [wrap(who.slice(0, 1), () => whoFull, "")[0].concat([{ t: "   " }], wrap(who.slice(1), () => whoFull, "")[0])]
    : wrap(who, () => whoFull, "");
  const h = Math.max(200, PAD_T + saidLines.length * SAID_LH + (saidLines.length && whoLines.length ? GAP : 0) + whoLines.length * WHO_LH + PAD_B);
  const top = h - PAD_B - whoLines.length * WHO_LH;
  return {
    h,
    said: saidLines.map((parts, i) => ({ x: PAD_L, y: PAD_T + i * SAID_LH + (SAID_LH - SAID_FS) / 2 + 0.8 * SAID_FS, parts })),
    who: whoLines.map((parts, i) => ({ x: PAD_L, y: top + i * WHO_LH + (WHO_LH - WHO_FS) / 2 + 0.8 * WHO_FS, parts })),
  };
}

/** @param {string} cls @param {Line} l */
const textLine = (cls, l) =>
  `<text class="${cls}" x="${f1(l.x)}" y="${f1(l.y)}" xml:space="preserve">${l.parts.map((p) => (p.k ? `<tspan class="k">${esc(p.t)}</tspan>` : esc(p.t))).join("")}</text>`;

/** Look A written in, for a printer with no stylesheet (the page uses styles.css and its tokens). The
 * grain is a touch fainter than the page's (.07, not .11): noise is most of a PNG's weight, and chat apps
 * drop previews over about 300 KB. */
const PRINT_STYLE = `<style>` +
  `.paper{fill:#fffaf0}.edge{fill:none;stroke:#d4698d;stroke-opacity:.3;stroke-width:1.2}.grain{opacity:.07}.grain-ink{flood-color:#33260f}` +
  `.flap{fill:none;stroke:#d4698d;stroke-width:1;opacity:.22}.fiber-soft{fill:none;stroke:#d4698d;stroke-width:.5;opacity:.13}` +
  `.marks{opacity:.72}.perf{fill:#fffaf0;stroke:#d4698d;stroke-width:1.7;stroke-dasharray:0 3.3;stroke-linecap:round}` +
  `.hair,.pic{fill:none;stroke:#d4698d;stroke-width:.8;stroke-linejoin:round;stroke-linecap:round}` +
  `.bh-stamp text,.bh-postmark text{fill:#d4698d;text-anchor:middle;font-family:"JetBrains Mono"}.bh-stamp .words{font-weight:650}.bh-stamp .sub{font-size:5px}` +
  `.bh-postmark circle,.bh-postmark .wave{fill:none;stroke:#d4698d;stroke-width:.8}.bh-postmark circle{opacity:.85}.bh-postmark .wave{opacity:.5}.bh-postmark .arc{fill:none;stroke:none}` +
  `.bh-postmark .ring{font-size:4.6px}.bh-postmark .day{font-size:7px}.bh-postmark .year{font-size:5.4px}` +
  `.words-said,.words-who{font-family:"JetBrains Mono";fill:#2a2418;opacity:.73}.words-said{font-size:${SAID_FS}px}.words-who{font-size:${WHO_FS}px}.k{fill:#6f6347}` +
  `</style>`;

/** @param {Envelope} env @param {Said[]} said @param {Said[]} who @param {string | undefined} timing @param {boolean} standalone @returns {string} */
function face(env, said, who, timing, standalone) {
  const L = layout(said, who), h = f1(L.h), seed = seedOf(env), gid = `bh-grain-${seed % 97}`;
  // Placed by attributes inside the drawing; the page's positioning classes are for the writer's HTML face.
  /** @param {string} svg @param {number} x @param {number} y @param {number} w @param {number} hh */
  const at = (svg, x, y, w, hh) =>
    svg.replace(/^<svg class="bh-env__(?:stamp|postmark) /, `<svg x="${x}" y="${y}" width="${w}" height="${hh}" class="`);
  const flaps = FLAP_LINES.replace(/^<svg [^>]*>/, "").replace(/<\/svg>$/, "");
  return `<svg class="bh-env__drawing"${standalone ? ` xmlns="http://www.w3.org/2000/svg"` : ""} viewBox="0 0 ${W} ${h}" width="${W}" height="${h}">` +
    (standalone ? PRINT_STYLE : "") +
    `<defs><clipPath id="${gid}-c"><rect width="${W}" height="${h}" rx="12"></rect></clipPath>` +
    `<filter id="${gid}" x="0" y="0" width="${W}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="${seed % 97}"></feTurbulence>` +
    `<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -.62" result="n"></feColorMatrix>` +
    `<feFlood class="grain-ink"></feFlood><feComposite in2="n" operator="in"></feComposite></filter></defs>` +
    `<g aria-hidden="true"><rect class="paper" width="${W}" height="${h}" rx="12"></rect>` +
    `<rect class="grain" width="${W}" height="${h}" rx="12" filter="url(#${gid})"></rect>` +
    `<g clip-path="url(#${gid}-c)" transform="scale(1 ${(L.h / 200).toFixed(4)})">${flaps}</g>` +
    (standalone ? `<rect class="edge" x=".6" y=".6" width="${W - 1.2}" height="${f1(L.h - 1.2)}" rx="11.6"></rect>` : "") + `</g>` +
    `<g class="marks">${at(stamp(timing), 243.2, 25.6, 60.8, 73.8)}${at(postmark(env), 213.8, 83.2, 115.2, 57.6)}</g>` +
    L.said.map((l) => textLine("words-said", l)).join("") + L.who.map((l) => textLine("words-who", l)).join("") +
    `</svg>`;
}

/**
 * The sealed outside as one standalone SVG for a picture printer: the same face as renderClosed,
 * with look A written in. Never opened and never the paper, so a link preview can't say whether a
 * letter was read. Pure, one input.
 * @param {Envelope} env
 * @returns {string}
 */
export function renderEnvelopeSvg(env) {
  const timing = env.timing ?? env.stamp;
  const { said, who } = outsideWords(env, timing);
  return face(env, said, who, timing, true);
}

/**
 * What the writer put on the outside, read once for every face: a typed timing, intention, need, own fields; to and from.
 * @param {Envelope} env
 * @param {string | undefined} timing
 * @returns {{ said: Said[], who: Said[] }}
 */
function outsideWords(env, timing) {
  const timingTyped = timing && !Object.hasOwn(PRESET_STAMP, timing) && timing.length > STAMP_WORDS_MAX;
  const own = Object.keys(env).filter((k) => !hidden(k));
  return {
    said: [
      ...(timingTyped ? [{ label: "timing:", text: timing }] : []),
      ...(env.intention ? [{ text: env.intention }] : []),
      ...(env.need ? [{ label: "need:", text: env.need }] : []),
      ...own.map((k) => ({ label: `${k.replace(/_/g, " ")}:`, text: env[k] })),
    ],
    who: [...(env.to ? [{ label: "to:", text: env.to }] : []), ...(env.from ? [{ label: "from:", text: env.from }] : [])],
  };
}
