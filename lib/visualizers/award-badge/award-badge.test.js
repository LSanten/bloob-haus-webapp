import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseLine, parseEntries, parseRank, asList } from "./parser.js";
import { render, ordinal, entryText, shortName } from "./renderer.js";
import { transform, indexAwards, decorateCards } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("award-badge parser", () => {
  it("reads NAME, LEVEL, YEAR, PLACE, LINK", () => {
    expect(parseLine("ASHRAE Technology Award, Region X, 2025, 1, https://www.ashrae.org/")).toMatchObject({
      kind: "award", name: "ASHRAE Technology Award", level: "Region X", year: "2025", place: "1", rank: 1, link: "https://www.ashrae.org/",
    });
  });

  it("finds the year and link in any position and tolerates missing parts", () => {
    expect(parseLine("https://x.org/a, ASHRAE Technology Award, 2025")).toMatchObject({ name: "ASHRAE Technology Award", level: "", year: "2025", link: "https://x.org/a" });
    expect(parseLine("LEED, Gold, 2023", "cert")).toMatchObject({ kind: "cert", name: "LEED", level: "Gold", year: "2023", rank: null });
  });

  it("understands 1, 1st and First Place", () => {
    expect([parseRank("1"), parseRank("1st"), parseRank("First Place"), parseRank("Second"), parseRank("Merit")]).toEqual([1, 1, 1, 2, null]);
  });

  it("accepts a list or a single string, and drops empty entries", () => {
    expect(asList("LEED, Gold")).toEqual(["LEED, Gold"]);
    expect(asList(undefined)).toEqual([]);
    expect(parseEntries({ awards: ["A, X, 2020", ""], certifications: "LEED, Gold" }).map((e) => e.kind)).toEqual(["award", "cert"]);
  });
});

describe("award-badge renderer", () => {
  const entries = parseEntries({
    awards: ["ASHRAE Technology Award, Region X, 2025, 1, https://www.ashrae.org/"],
    certifications: ["LEED, Gold, 2023"],
  });

  it("writes the label as real text with the place spelled out", () => {
    expect(entryText(entries[0])).toEqual(["ASHRAE Technology Award", "Region X · 2025 · 1st Place"]);
    expect(entryText(entries[1])).toEqual(["LEED Gold", "Certified 2023"]);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });

  it("renders a seal per entry and links only when a link is given", () => {
    const html = render(entries, { style: "tab", placement: "hero" });
    expect(html).toContain('class="award-badges award-badges--hero"');
    expect(html.match(/<svg class="award-seal /g)).toHaveLength(2);
    expect(html.match(/<a class="award-badge__item award-badge__link" href="https:\/\/www.ashrae.org\/"/g)).toHaveLength(1);
    expect(html).toContain("<span class=\"award-badge__title\">LEED Gold</span>");
  });

  it("escapes text and falls back to safe defaults", () => {
    const html = render(parseEntries({ awards: ['<b>Best</b> "Award", 2024'] }), { style: "nope", edge: "nope", placement: "x y" });
    expect(html).toContain("&lt;b&gt;Best&lt;/b&gt; &quot;Award&quot;");
    expect(html).toContain("award-badge--tab");
    expect(html).not.toContain("award-badges--x");
  });

  it("draws every edge", () => {
    for (const edge of ["ribbon", "wax", "scallop", "star", "circle"]) {
      expect(render(entries, { edge })).toContain("award-seal__wax");
    }
  });

  it("renders nothing without entries", () => {
    expect(render([])).toBe("");
  });

  it("puts the short name inside the icon: ribbon rosette for awards, plaque for certifications", () => {
    expect(shortName(entries[0])).toBe("ASHRAE");
    const html = render(entries);
    expect(html).toMatch(/award-seal--award[\s\S]*award-seal__tail[\s\S]*>ASHRAE<\/text>[\s\S]*>1st<\/text>/);
    expect(html).toMatch(/award-seal--plaque award-seal--level-gold[\s\S]*>LEED<\/text>[\s\S]*>GOLD<\/text>/);
  });

  it("squeezes a long short-name to fit the seal", () => {
    const html = render(parseEntries({ certifications: ["GreenPoint, Platinum, 2022"] }));
    expect(html).toMatch(/textLength="52" lengthAdjust="spacingAndGlyphs">GreenPoint</);
  });

  it("icon style: seals only, label for screen readers, no nested links", () => {
    const html = render(entries, { style: "icon", placement: "card" });
    expect(html).toContain("award-badges--card");
    expect(html.match(/class="award-badge__icon"/g)).toHaveLength(2);
    expect(html).toContain('title="ASHRAE Technology Award, Region X · 2025 · 1st Place"');
    expect(html).not.toContain("<a ");
  });
});

describe("award-badge on cards", () => {
  const nodes = [
    { id: "/projects/regency-ballroom/", awards: ["ASHRAE Technology Award, Region X, 2025, 1"] },
    { id: "/projects/plain/" },
  ];
  const byUrl = indexAwards(nodes);

  it("indexes only pages that have entries", () => {
    expect([...byUrl.keys()]).toEqual(["/projects/regency-ballroom/"]);
  });

  it("pins icons onto collection cards and card-preview cards that link to such pages", () => {
    const html =
      '<a class="fp-card" href="/projects/regency-ballroom/">\n  <div class="fp-card__image-wrap"><img src="x"></div></a>' +
      '<a class="fp-card" href="/projects/plain/">\n  <div class="fp-card__image-wrap"><img src="y"></div></a>' +
      '<a class="projects__container" href="/projects/regency-ballroom/"><div class="projects__inner-container"><div class="projects__image"><img src="z"></div></div></a>';
    const out = decorateCards(html, byUrl);
    expect(out.match(/award-badges--card/g)).toHaveLength(2);
    expect(decorateCards(out, byUrl)).toBe(out); // idempotent
  });

  it("does nothing when no page has entries", () => {
    const html = '<a class="fp-card" href="/a/"><div class="fp-card__image-wrap"></div></a>';
    expect(decorateCards(html, indexAwards([{ id: "/a/" }]))).toBe(html);
  });
});

describe("award-badge transform", () => {
  // What Nunjucks writes for `{{ awards | dump | escape }}`
  const slot = (awards, certs = "") =>
    `<div class="award-badge-slot" data-style="tab" data-placement="hero" data-awards="${awards}" data-certifications="${certs}"></div>`;

  it("replaces a slot with badges read from escaped JSON", () => {
    const out = transform(`<p>a</p>${slot("[&quot;ASHRAE Technology Award, Region X, 2025, 1&quot;]")}<p>b</p>`);
    expect(out).toContain("award-badges--hero");
    expect(out).toContain("1st Place");
    expect(out).not.toContain("award-badge-slot");
    expect(out.startsWith("<p>a</p>") && out.endsWith("<p>b</p>")).toBe(true);
  });

  it("an empty or undefined slot renders nothing", () => {
    expect(transform(`<main>${slot("", "")}</main>`)).toBe("<main></main>");
    expect(transform(`<main>${slot("undefined", "null")}</main>`)).toBe("<main></main>");
  });

  it("leaves pages without a slot untouched", () => {
    const page = "<p>no badges</p>";
    expect(transform(page)).toBe(page);
  });
});

describe("award-badge package", () => {
  it("styles.css uses theme tokens only", () => {
    const css = readFileSync(join(here, "styles.css"), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/font-family:\s*['"]/);
  });

  it("detects on the wrapper class its stylesheet owns", () => {
    const manifest = JSON.parse(readFileSync(join(here, "manifest.json"), "utf-8"));
    expect(manifest.detect.selectors).toEqual([".award-badges"]);
  });
});
