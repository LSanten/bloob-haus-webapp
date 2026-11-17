/**
 * The letter's pure renderers. Ported with the letter from the post office
 * (bloob-haus-cloud/app/test/letter-closed.test.ts and note-render.test.ts, 2026-11-16);
 * the tests for the paper in the envelope, the webapp's glue and the copy rule are new here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { renderBack, renderClosed, renderTearing, TEARS, renderEnvelopeSvg } from "./renderer.js";
import { renderPaper, renderPaperBody } from "./paper.js";
import { renderNote, renderFilescope, envelopeOf } from "./index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** What the envelope says, as a reader hears it: tags gone, entities decoded, spaces collapsed. */
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

describe("renderClosed", () => {
  it("draws a sealed envelope with to/from/stamp, escaped; no dates typed on the outside", () => {
    const html = renderClosed({ to: "Whitney <3", from: "Leon", date_created: "2026-09-17", stamp: "no-rush" });
    expect(html).toContain("Whitney &lt;3");
    expect(html).toContain("Leon");
    expect(html).toContain("no rush");
    expect(html).toContain("sealed, not opened yet");
    expect(text(html)).not.toContain("2026-09-17");   // the written date is inside, on the paper (2026-11-12)
    expect(text(html)).toContain("to: Whitney <3");
    expect(html).not.toContain("<3");
    expect(html).toMatch(/<figure[^>]*class="bh-env envelope envelope-sealed"/);
  });
  it("draws timing, intention, need and the writer's own fields; an old `stamp` still reads as timing", () => {
    const html = renderClosed({ date_created: "2026-09-24", timing: "please-open-soon", intention: "a thank you", need: "a short answer is fine", mood: "sunny", "sealed-id": "abc", mark_sticker: "x" });
    expect(html).toContain('aria-label="A stamp: open soon, please"');   // the timing is the stamp (2026-11-12)
    expect(text(html)).toContain("OPEN SOON please");
    expect(html).toContain("a thank you");
    expect(text(html)).toContain("a short answer is fine");   // wrapped onto two lines of the drawing, still one sentence
    expect(text(html)).toContain("mood: sunny");
    expect(html).not.toContain("sealed-id");
    expect(html).not.toContain("mark_sticker");
    expect(renderClosed({ date_created: "2026-09-24", stamp: "no-rush" })).toContain("no rush");
  });
  it("the writer's own timing goes on the stamp; words too long for a stamp are typed on the envelope", () => {
    const short = renderClosed({ date_created: "2026-09-24", timing: "on your birthday" });
    expect(short).toContain('aria-label="A stamp: on your birthday"');
    expect(text(short)).not.toContain("timing:");
    const long = "open it when the first snow falls on the roof";
    const html = renderClosed({ date_created: "2026-09-24", timing: long });
    expect(text(html)).toContain(`timing: ${long}`);
    expect(html).toContain('aria-label="A stamp"');
  });
  it("the system's own bloob-* keys are never drawn as if the writer wrote them", () => {
    const html = renderClosed({ date_created: "2026-09-20", "bloob-copied-from": "mail/xxxm9d8588cx07j96a6dhd97", mood: "sunny" });
    expect(html).not.toContain("copied");
    expect(text(html)).toContain("mood: sunny");
  });
  it("a stamp named like an Object property is shown verbatim, not looked up", () => {
    expect(renderClosed({ date_created: "2026-09-17", stamp: "constructor" })).toContain("constructor");
  });
  it("lots of writing: all of it is on the face, nothing cut to … or counted away (2026-11-12)", () => {
    const many = { date_created: "2026-09-17", date_postmarked: "2026-09-18", intention: "hi", need: "nothing" };
    for (let i = 0; i < 5; i++) many[`field_${i}`] = `value ${i} `.repeat(12);
    const html = renderClosed(many);
    for (let i = 0; i < 5; i++) expect(text(html)).toContain(`field ${i}: ${`value ${i} `.repeat(12).trim()}`);
    expect(text(html)).not.toMatch(/more|…/);
  });
  it("shows the post office's postmark when there is no stamp", () => {
    const html = renderClosed({ date_created: "2026-09-17", date_postmarked: "2026-09-20" });
    expect(text(html)).not.toContain("postmarked");   // the postmark says it (2026-11-12)
    expect(html).toContain('aria-label="Postmarked 2026-09-20"');
    expect(html).toContain("BLOOB HAUS POST");
    expect(text(html)).toContain("20 SEP");
    expect(text(html)).not.toContain("written");
  });
  it("draws a torn envelope once opened", () => {
    const html = renderClosed({ date_created: "2026-09-17", opened: "2026-09-20T10:00:00.000Z" });
    expect(html).toContain("opened");
    expect(html).not.toContain("sealed");
    expect(html).not.toContain("not opened yet");
  });
});

describe("renderTearing (U17)", () => {
  const env = { to: "Whitney", from: "Leon", date_created: "2026-10-02" };
  const tearLength = (html) => (/<path class="tear" d="([^"]*)"/.exec(html)?.[1].split(" L").length ?? 0);

  it("each tear rips more of the top, and changes nothing else on the envelope", () => {
    const outside = (html) => text(html).replace(/sealed, not opened yet|tearing open|torn open/, "");
    const closed = renderClosed(env);
    expect(tearLength(closed)).toBe(0);
    const frames = [1, 2, 3].map((n) => renderTearing(env, n));
    for (const f of frames) expect(outside(f)).toBe(outside(closed));
    expect(tearLength(frames[0])).toBeLessThan(tearLength(frames[1]));
    expect(tearLength(frames[1])).toBeLessThan(tearLength(frames[2]));
  });

  it("the last tear is the same tear the opened envelope has, and only it lets the strip float away", () => {
    const opened = renderClosed({ ...env, opened: "2026-10-02" });
    const last = renderTearing(env, TEARS);
    expect(/<path class="tear" d="[^"]*"/.exec(last)?.[0]).toBe(/<path class="tear" d="[^"]*"/.exec(opened)?.[0]);
    expect(last).toContain("bh-env__ghost");
    expect(renderTearing(env, 2)).not.toContain("bh-env__ghost");
    expect(opened).not.toContain("bh-env__ghost");
    expect(opened).toContain("bh-env__peek");
    // Torn all the way, the paper is already there to be seen (and taken out); not before.
    expect(last).toContain("bh-env__peek");
    expect(renderTearing(env, 2)).not.toContain("bh-env__peek");
  });

  it("says it is tearing, then torn, and never claims the office opened it", () => {
    expect(renderTearing(env, TEARS)).toContain("torn open");
    expect(renderTearing(env, TEARS)).not.toMatch(/>opened|\bopened\b(?! for)/);
    const html = renderTearing(env, 1);
    expect(html).toContain("tearing open");
    expect(html).toMatch(/class="bh-env envelope envelope-sealed envelope-tearing"/);
    expect(html).not.toContain("sealed, not opened yet");
  });

  it("is pure: same envelope, same tear, same picture", () => {
    expect(renderTearing(env, 2)).toBe(renderTearing(env, 2));
  });

  it("every letter tears its own way", () => {
    const a = /<path class="tear" d="[^"]*"/.exec(renderTearing(env, 3))?.[0];
    const b = /<path class="tear" d="[^"]*"/.exec(renderTearing({ ...env, to: "Michelle" }, 3))?.[0];
    expect(a).not.toBe(b);
  });
});

describe("renderBack: the other side of the same envelope (2026-11-15)", () => {
  const env = { to: "Whitney <3", from: "Leon", date_created: "2026-09-17", date_postmarked: "2026-09-20", timing: "no-rush", intention: "a thought" };

  it("is its own back, a picture only: flap, seams, a seal, the office's line; nothing of the writer's", () => {
    const back = renderBack(env);
    expect(back).toMatch(/<figure class="bh-env bh-env--back" data-state="sealed"[^>]*aria-hidden="true"/);
    expect(back).not.toMatch(/class="[^"]*\benvelope\b/);   // the letter is named once, by its front
    for (const piece of ["flap-paper", `class="seam"`, "bh-env__seal", "bh-env__office"]) expect(back).toContain(piece);
    expect(back).toContain("bloob haus \u00b7 encrypted post office");
    expect(back).not.toContain("\u2014");   // no em dash in product copy
    expect(back).not.toContain("bh-env__status");   // the front has the words for the ear
    for (const theirs of ["Whitney", "Leon", "a thought", "bh-env__stamp", "bh-env__postmark", " id="]) expect(back).not.toContain(theirs);
  });

  it("is in the same state as the front: sealed, torn so far, opened", () => {
    expect(renderBack(env)).not.toContain("clip-path");
    expect(renderBack(env)).not.toContain("bh-env__peek");
    expect(renderBack(env, 2)).toContain(`data-tears="2"`);
    expect(renderBack(env, 2)).toContain(`data-state="tearing"`);
    expect(renderBack(env, 2)).toContain("bh-env__rip--back");
    expect(renderBack(env, 2)).not.toContain("clip-path");
    const opened = renderBack({ ...env, opened: "2026-10-02" });
    expect(opened).toContain(`data-state="opened"`);
    expect(opened).toContain("bh-env__peek");
    expect(opened).toContain("clip-path");
    expect(renderBack(env, TEARS)).toContain("clip-path");
  });

  it("is torn along the same edge, seen from behind: the clip is the front's, mirrored", () => {
    const pts = (html) => /clip-path:polygon\(([^)]*\)?[^"]*)"/.exec(html)[1].split(", ").map((p) => p.split(" "));
    const f = pts(renderClosed({ ...env, opened: "2026-10-02" })), b = pts(renderBack({ ...env, opened: "2026-10-02" }));
    expect(b.length).toBe(f.length);
    const tearPts = f.length - 2;
    expect(b[4][1]).toBe(f[tearPts - 1 - 4][1]);
    expect(parseFloat(b[4][0])).toBeCloseTo(100 - parseFloat(f[tearPts - 1 - 4][0]), 1);
  });

  it("is pure", () => {
    expect(renderBack(env, 1)).toBe(renderBack(env, 1));
  });
});

describe("renderEnvelopeSvg: the page's face, standalone for a printer (Leon, 2026-11-15)", () => {
  it("is one SVG with its look and words written in, never opened", () => {
    const svg = renderEnvelopeSvg({ to: "Steph", from: "Leon", timing: "no-rush", date_postmarked: "2026-11-15", opened: "2026-11-15" });
    expect(svg).toMatch(/^<svg class="bh-env__drawing" xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 320 200.0"/);
    expect(svg).toContain("<style>");
    expect(text(svg)).toContain("to: Steph from: Leon");
    expect(svg).toContain("BLOOB HAUS POST");
  });
  it("grows taller for long words instead of cutting them, at every size the same lines", () => {
    const long = renderEnvelopeSvg({ to: "Steph", intention: "word ".repeat(80).trim() });
    const h = Number(/viewBox="0 0 320 ([\d.]+)"/.exec(long)[1]);
    expect(h).toBeGreaterThan(200);
    expect(text(long)).not.toContain("…");
  });
});


describe("renderPaperBody: what may be written on the paper", () => {
  it("renders basic markdown", () => {
    expect(renderPaperBody("Hi **bb**")).toBe("<p>Hi <strong>bb</strong></p>\n");
  });
  it("shows raw HTML as text, never as tags", () => {
    const out = renderPaperBody('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toMatch(/<img/);
  });
  it("renders images as their alt text and never emits an <img>", () => {
    const out = renderPaperBody("![a stamp](https://tracker.example/pixel.png)");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("tracker.example");
    expect(out).toContain('<span class="img-alt">a stamp</span>');
  });
  it("keeps single line breaks — a letter's line endings are meant", () => {
    expect(renderPaperBody("one line\nand the next")).toBe("<p>one line<br>\nand the next</p>\n");
    // a blank line is still a new paragraph
    expect(renderPaperBody("a\n\nb")).toBe("<p>a</p>\n<p>b</p>\n");
  });
  it("turns a pasted URL into a link, with rel=noopener, and leaves dangerous schemes alone", () => {
    const out = renderPaperBody("see https://bloob.haus for more");
    expect(out).toContain('href="https://bloob.haus"');
    expect(out).toMatch(/rel="noopener[^"]*"/);
    expect(renderPaperBody("javascript:alert(1)")).not.toContain("<a");
  });
  it("adds rel=noopener to links and drops javascript: urls", () => {
    expect(renderPaperBody("[x](https://example.com)")).toContain("noopener");
    // markdown-it's validateLink rejects the javascript: scheme outright, so the
    // whole construct falls back to literal text rather than an <a href=...> —
    // there is no clickable link. Assert on the real security property (no
    // javascript: href is ever emitted) rather than substring absence, since the
    // literal source text "javascript:alert(1)" legitimately survives as prose.
    expect(renderPaperBody("[x](javascript:alert(1))")).not.toContain('href="javascript:');
  });
});

describe("a link's tab is decided by where it goes (ui-principles #15, Leon 2026-11-15)", () => {
  const HOST = "post-office.bloob.haus";
  it("another host, even another bloob.haus subdomain, opens a new tab and is told nothing", () => {
    for (const url of ["https://example.com/x", "https://leons.bloob.haus/", "http://bloob.haus"]) {
      const out = renderPaperBody(`[x](${url})`, HOST);
      expect(out).toContain('target="_blank"');
      expect(out).toContain('rel="noopener noreferrer"');
    }
  });
  it("this host, a relative link, mail and phone stay in the tab", () => {
    for (const url of ["https://post-office.bloob.haus/counter", "/lockers/abc", "mailto:a@b.c", "tel:+491234"]) {
      expect(renderPaperBody(`[x](${url})`, HOST)).not.toContain("target=");
    }
  });
  it("without knowing where it is drawn, any web address counts as elsewhere", () => {
    expect(renderPaperBody("see https://post-office.bloob.haus")).toContain('target="_blank"');
  });
});

describe("renderPaper: the open sheet is plain", () => {
  it("holds the day it was written and the words, and nothing else from the envelope", () => {
    const html = renderPaper({ to: "Whitney", from: "Leon", date_created: "2026-11-16" }, "Thank you.");
    expect(html).toBe('<article class="bh-paper"><p class="bh-paper__date">2026-11-16</p><div class="note-body bh-paper__body"><p>Thank you.</p>\n</div></article>');
    expect(html).not.toMatch(/Dear|Whitney|Leon/);   // no greeting, no signature made from the envelope
  });
  it("has no date line when the envelope has none", () => {
    expect(renderPaper({}, "hi")).not.toContain("bh-paper__date");
  });
});

describe("the paper in the envelope (Leon's feedback, 2026-11-16)", () => {
  const env = { to: "Whitney", from: "Leon", date_created: "2026-11-15" };
  const opened = { ...env, opened: "2026-11-16" };
  const inside = { html: renderPaperBody("The lake was **still**.\nI keep thinking of it.") };
  const peek = (html) => /<div class="bh-env__peek[^>]*>[\s\S]*?(?=<div class="bh-env__body)/.exec(html)?.[0] ?? "";

  it("with nothing known of the inside, it is the blank short paper it always was", () => {
    expect(peek(renderClosed(opened))).toBe('<div class="bh-env__peek" aria-hidden="true"></div>');
    expect(renderClosed(opened, {})).toBe(renderClosed(opened));
    expect(renderClosed(opened, undefined)).toBe(renderClosed(opened));
  });

  it("with the words, the paper carries the letter's beginning, set like the top of the sheet", () => {
    const p = peek(renderClosed(opened, inside));
    expect(p).toContain('<div class="bh-env__peek bh-env__peek--paper"><div class="bh-env__sheet">');
    expect(p).toContain('<p class="bh-paper__date">2026-11-15</p>');
    expect(p).toContain('<div class="note-body bh-paper__body"><p>The lake was <strong>still</strong>.<br>');
    expect(p).not.toContain("aria-hidden");   // real words, for the ear too
    expect(text(p)).not.toMatch(/Dear|Whitney|Leon/);   // the paper stays plain
  });

  it("the last tear shows it too, so the paper taken out is the one that was seen", () => {
    expect(peek(renderTearing(env, TEARS, inside))).toContain("I keep thinking of it.");
  });

  it("a sealed envelope never shows the inside, even when a host passes it", () => {
    expect(renderClosed(env, inside)).toBe(renderClosed(env));
    for (const t of [0, 1, 2]) expect(renderTearing(env, t, inside)).toBe(renderTearing(env, t));
    expect(renderBack(env, 0, inside)).toBe(renderBack(env));
    expect(renderClosed(env, inside)).not.toContain("lake");
  });

  it("the picture for a link preview takes no inside at all", () => {
    expect(renderEnvelopeSvg.length).toBe(1);
    expect(renderEnvelopeSvg(opened, inside)).toBe(renderEnvelopeSvg(opened));
    expect(renderEnvelopeSvg(opened, inside)).not.toContain("lake");
  });

  it("without words, a host may say how long the letter is: the blank paper is that long", () => {
    expect(peek(renderClosed(opened, { lines: 3 }))).toBe('<div class="bh-env__peek" style="--bh-peek-h:22.2cqi" aria-hidden="true"></div>');
    expect(peek(renderClosed(opened, { lines: 1 }))).toContain("--bh-peek-h:16.0cqi");   // a short letter, a short paper
    expect(peek(renderClosed(opened, { lines: 400 }))).toContain("--bh-peek-h:1530.8cqi");   // the look folds it to the envelope
  });

  it("the look folds the paper to fit: never longer than the envelope, words fading before the fold", () => {
    const css = readFileSync(path.join(HERE, "styles.css"), "utf-8");
    expect(css).toMatch(/\.bh-env__peek--paper \{ top: -13cqi;[^}]*max-height: calc\(100% \+ 10cqi\)[^}]*overflow: hidden/);
    expect(css).toMatch(/\.bh-env__peek\[style\*="--bh-peek-h"\] \{[^}]*max-height: calc\(100% \+ 2\.6cqi\)/);
    expect(css).toMatch(/\.bh-env__sheet \{[^}]*mask-image: linear-gradient/);
  });

  it("the back has the same paper, as long as the front's, its words not shown", () => {
    const back = renderBack(opened, undefined, inside);
    expect(back).toContain("bh-env__peek--paper");
    expect(back).toMatch(/^<figure class="bh-env bh-env--back"[^>]*aria-hidden="true"/);
    expect(readFileSync(path.join(HERE, "styles.css"), "utf-8")).toContain(".bh-env--back .bh-env__sheet { visibility: hidden; }");
  });
});

describe("the webapp's glue (index.js)", () => {
  const note = { data: { "bloob-shape": "letter", to: "Whitney", from: "Leon", timing: "no-rush", date_created: "2026-11-16", tags: ["a"], empty: "" }, body: "Thank you.\n\n<b>raw</b>" };

  it("draws a whole note as a letter: the envelope from the frontmatter, the paper from the body", () => {
    const html = renderNote(note);
    expect(html).toMatch(/^<div class="bh-letter"><div class="bh-letter__outside"><figure class="bh-env envelope envelope-sealed"/);
    expect(text(html)).toContain("to: Whitney from: Leon");
    expect(html).toContain('aria-label="A stamp: no rush, open whenever"');
    expect(html).toContain('<article class="bh-paper"><p class="bh-paper__date">2026-11-16</p>');
    expect(html).toContain("&lt;b&gt;raw&lt;/b&gt;");   // the letter's own markdown rules
    expect(html).not.toContain("bloob-shape");
    expect(html.match(/Thank you\./g)).toHaveLength(1);   // sealed: the words are on the sheet only
  });

  it("an envelope is flat strings: lists and empty values are left off", () => {
    expect(envelopeOf(note.data)).toEqual({ "bloob-shape": "letter", to: "Whitney", from: "Leon", timing: "no-rush", date_created: "2026-11-16" });
    expect(envelopeOf({ n: 3 })).toEqual({ n: "3" });
  });

  it("a note that says it was opened shows the torn envelope with the top of its paper in it", () => {
    const html = renderNote({ ...note, data: { ...note.data, opened: "yes" } });
    expect(html).toContain("envelope-opened");
    expect(html).toContain("bh-env__peek--paper");
  });

  it("the site builder leaves a letter's page as it is, for now", () => {
    expect(renderFilescope({}, "the body")).toBe("the body");
  });
});

describe("made to be copied into the post office as they are", () => {
  it("renderer.js imports nothing; paper.js imports only markdown-it", () => {
    const imports = (file) => [...readFileSync(path.join(HERE, file), "utf-8").matchAll(/^\s*import\s[^'"]*["']([^"']+)["']/gm)].map((m) => m[1]);
    expect(imports("renderer.js")).toEqual([]);
    expect(imports("paper.js")).toEqual(["markdown-it"]);
  });
  it("neither touches a document, a window or a file", () => {
    for (const file of ["renderer.js", "paper.js"]) {
      const code = readFileSync(path.join(HERE, file), "utf-8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code).not.toMatch(/\b(document|window|localStorage|require|process)\b/);
    }
  });
  it("the words people read use no em dash", () => {
    for (const file of ["schema.md", "manifest.json"]) expect(readFileSync(path.join(HERE, file), "utf-8")).not.toContain("—");
    expect(renderNote({ data: { to: "A", timing: "no-rush", date_postmarked: "2026-11-16", opened: "x" }, body: "hi" })).not.toContain("—");
  });
});
