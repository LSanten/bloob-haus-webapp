/**
 * Fridge Magnets — Unit tests
 *
 * Tests cover pure utility functions (no DOM needed) and the build-time
 * index.js transform. Browser interaction logic is not unit-tested here.
 */

import { describe, it, expect } from "vitest";

import {
  parseInput,
  countWords,
  buildArrangement,
  buildSelectionArrangement,
  buildPreviewCards,
  parseCSV,
  parseCSVRow,
  passesModeration,
  escapeHtml,
} from "./utils.js";

import { transform } from "./index.js";

/* ─── parseInput ─────────────────────────────────────────────────────────── */

describe("parseInput", () => {
  it("parses plain bracket cards", () => {
    expect(parseInput("[hello] [world]")).toEqual([
      { text: "hello", x: null, y: null },
      { text: "world", x: null, y: null },
    ]);
  });

  it("parses positioned cards", () => {
    expect(parseInput("[hello](10,20) [world](80,20)")).toEqual([
      { text: "hello", x: 10, y: 20 },
      { text: "world", x: 80, y: 20 },
    ]);
  });

  it("preserves + prefix for custom cards", () => {
    expect(parseInput("[+custom](30,0)")[0].text).toBe("+custom");
  });

  it("filters empty cards", () => {
    const result = parseInput("[] [hello]");
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("hello");
  });

  it("returns empty array for empty input", () => {
    expect(parseInput("")).toEqual([]);
  });
});

/* ─── countWords ─────────────────────────────────────────────────────────── */

describe("countWords", () => {
  it("counts words across multiple card texts", () => {
    expect(countWords(["hello world", "foo"])).toBe(3);
  });

  it("handles empty array", () => {
    expect(countWords([])).toBe(0);
  });
});

/* ─── buildArrangement ───────────────────────────────────────────────────── */

describe("buildArrangement", () => {
  it("serializes cards sorted by row then x", () => {
    const cards = [
      { text: "B", x: 80, y: 0, custom: false },
      { text: "A", x: 10, y: 0, custom: false },
      { text: "C", x: 10, y: 50, custom: false },
    ];
    expect(buildArrangement(cards)).toBe("[A](10,0) [B](80,0) [C](10,50)");
  });

  it("adds + prefix for custom cards", () => {
    expect(
      buildArrangement([{ text: "myword", x: 10, y: 0, custom: true }]),
    ).toBe("[+myword](10,0)");
  });

  it("rounds float positions", () => {
    expect(
      buildArrangement([{ text: "hi", x: 10.7, y: 5.3, custom: false }]),
    ).toBe("[hi](11,5)");
  });
});

/* ─── buildSelectionArrangement ──────────────────────────────────────────── */

describe("buildSelectionArrangement", () => {
  it("returns empty string when nothing selected", () => {
    const cards = [{ text: "A", x: 10, y: 0, selected: false, custom: false }];
    expect(buildSelectionArrangement(cards)).toBe("");
  });

  it("normalizes coordinates to origin", () => {
    const cards = [
      { text: "A", x: 100, y: 50, selected: true, custom: false },
      { text: "B", x: 160, y: 50, selected: true, custom: false },
    ];
    expect(buildSelectionArrangement(cards)).toBe("[A](0,0) [B](60,0)");
  });

  it("only includes selected cards", () => {
    const cards = [
      { text: "A", x: 10, y: 0, selected: true, custom: false },
      { text: "B", x: 80, y: 0, selected: false, custom: false },
    ];
    const result = buildSelectionArrangement(cards);
    expect(result).toContain("[A]");
    expect(result).not.toContain("[B]");
  });

  it("adds + prefix for selected custom cards", () => {
    const cards = [{ text: "hello", x: 10, y: 0, selected: true, custom: true }];
    expect(buildSelectionArrangement(cards)).toContain("[+hello]");
  });
});

/* ─── buildPreviewCards ──────────────────────────────────────────────────── */

describe("buildPreviewCards", () => {
  it("returns empty array for empty input", () => {
    expect(buildPreviewCards([])).toEqual([]);
  });

  it("normalizes positions to origin", () => {
    const cards = [
      { text: "A", x: 50, y: 30, custom: false },
      { text: "B", x: 120, y: 30, custom: false },
    ];
    const result = buildPreviewCards(cards);
    expect(result[0].x).toBe(0);
    expect(result[0].y).toBe(0);
    expect(result[1].x).toBe(70);
  });

  it("passes through custom flag", () => {
    expect(buildPreviewCards([{ text: "hi", x: 0, y: 0, custom: true }])[0].custom).toBe(true);
  });
});

/* ─── parseCSVRow ────────────────────────────────────────────────────────── */

describe("parseCSVRow", () => {
  it("splits plain CSV", () => {
    expect(parseCSVRow("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCSVRow('"hello, world",b')).toEqual(["hello, world", "b"]);
  });

  it("handles escaped quotes", () => {
    expect(parseCSVRow('"say ""hi""",b')).toEqual(['say "hi"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCSVRow("a,,c")).toEqual(["a", "", "c"]);
  });
});

/* ─── parseCSV ───────────────────────────────────────────────────────────── */

describe("parseCSV", () => {
  it("returns empty array for header-only input", () => {
    expect(parseCSV("a,b,c")).toEqual([]);
  });

  it("maps headers to values", () => {
    const result = parseCSV("name,category\nAlice,funny");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Alice");
    expect(result[0].category).toBe("funny");
  });

  it("skips blank lines", () => {
    expect(parseCSV("name\nAlice\n\nBob").length).toBe(2);
  });

  it("trims header and value whitespace", () => {
    const result = parseCSV(" name , val \n Alice , yes ");
    expect(result[0].name).toBe("Alice");
  });
});

/* ─── passesModeration ───────────────────────────────────────────────────── */

describe("passesModeration", () => {
  it("blocks rows with approved=no", () => {
    expect(passesModeration({ approved: "no", Timestamp: new Date().toISOString() }, 24)).toBe(false);
  });

  it("always passes rows with approved=yes regardless of age", () => {
    const ancient = new Date(Date.now() - 999 * 36e5).toISOString();
    expect(passesModeration({ approved: "yes", Timestamp: ancient }, 24)).toBe(true);
  });

  it("passes recent rows using Timestamp column", () => {
    expect(passesModeration({ approved: "", Timestamp: new Date().toISOString() }, 24)).toBe(true);
  });

  // TODO: when time-windowed moderation is implemented, old unapproved rows should be blocked:
  // it("blocks old rows with no approval set", () => {
  //   const old = new Date(Date.now() - 48 * 36e5).toISOString();
  //   expect(passesModeration({ approved: "", Timestamp: old }, 24)).toBe(false);
  // });

  // TODO: when time-windowed moderation is implemented, dateless rows should be blocked:
  // it("blocks rows with no date at all", () => {
  //   expect(passesModeration({ approved: "", Timestamp: "" }, 24)).toBe(false);
  // });

  it("falls back to submitted_at if Timestamp is missing", () => {
    expect(passesModeration({ approved: "", submitted_at: new Date().toISOString() }, 24)).toBe(true);
  });
});

/* ─── escapeHtml ─────────────────────────────────────────────────────────── */

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

/* ─── index.js transform ─────────────────────────────────────────────────── */

describe("transform (index.js)", () => {
  it("replaces fridge-magnets code fence with a div", () => {
    const html = `<pre><code class="language-fridge-magnets">cards: "[hello] [world]"\nheight: 320\n</code></pre>`;
    const result = transform(html);
    expect(result).toContain("<div");
    expect(result).toContain('class="fridge-magnets-visualizer"');
    expect(result).toContain('data-height="320"');
  });

  it("sets data-board when board is provided", () => {
    const html = `<pre><code class="language-fridge-magnets">board: "My Board"\n</code></pre>`;
    expect(transform(html)).toContain('data-board="My Board"');
  });

  it("sets data-feedback-allow when feedback-allow is yes", () => {
    const html = `<pre><code class="language-fridge-magnets">feedback-allow: yes\n</code></pre>`;
    expect(transform(html)).toContain('data-feedback-allow="true"');
  });

  it("does not set data-feedback-allow when omitted", () => {
    const html = `<pre><code class="language-fridge-magnets">cards: "[hi]"\n</code></pre>`;
    expect(transform(html)).not.toContain("data-feedback-allow");
  });

  it("sets data-show-editor when show-editor is yes", () => {
    const html = `<pre><code class="language-fridge-magnets">show-editor: yes\n</code></pre>`;
    expect(transform(html)).toContain('data-show-editor="true"');
  });

  it("encodes feedback-fields as separate data attributes", () => {
    const yaml =
      "feedback-allow: yes\nfeedback-fields:\n  arrangement: entry.111\n  board: entry.222\n  type: entry.333\n";
    const html = `<pre><code class="language-fridge-magnets">${yaml}</code></pre>`;
    const result = transform(html);
    expect(result).toContain('data-field-arrangement="entry.111"');
    expect(result).toContain('data-field-board="entry.222"');
    expect(result).toContain('data-field-type="entry.333"');
  });

  it("sets data-mode and data-gsheet-csv for display-feedback", () => {
    const html = `<pre><code class="language-fridge-magnets">mode: display-feedback\nfeedback-gsheet-csv: https://example.com/sheet.csv\n</code></pre>`;
    const result = transform(html);
    expect(result).toContain('data-mode="display-feedback"');
    expect(result).toContain('data-gsheet-csv="https://example.com/sheet.csv"');
  });

  it("defaults height to 280 when omitted", () => {
    const html = `<pre><code class="language-fridge-magnets">cards: "[hi]"\n</code></pre>`;
    expect(transform(html)).toContain('data-height="280"');
  });

  it("handles malformed YAML gracefully without throwing", () => {
    const html = `<pre><code class="language-fridge-magnets">: : : invalid\n</code></pre>`;
    expect(() => transform(html)).not.toThrow();
  });

  it("passes through unrelated HTML unchanged", () => {
    const html = `<p>Hello world</p>`;
    expect(transform(html)).toBe(html);
  });

  it("extracts entry IDs from pre-filled URL and converts to formResponse", () => {
    const prefilled =
      "https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111=A&entry.222=B&entry.333=C&entry.444=D&entry.555=E";
    const yaml = `feedback-gform-url: "${prefilled}"\n`;
    const html = `<pre><code class="language-fridge-magnets">${yaml}</code></pre>`;
    const result = transform(html);
    expect(result).toContain('data-gform-url="https://docs.google.com/forms/d/e/FORM_ID/formResponse"');
    expect(result).toContain('data-field-arrangement="entry.111"');
    expect(result).toContain('data-field-board="entry.222"');
    expect(result).toContain('data-field-type="entry.333"');
    expect(result).toContain('data-field-name="entry.444"');
    expect(result).toContain('data-field-category="entry.555"');
  });

  it("explicit feedback-fields override pre-filled URL entries", () => {
    const prefilled =
      "https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.111=A&entry.222=B&entry.333=C";
    const yaml = `feedback-gform-url: "${prefilled}"\nfeedback-fields:\n  arrangement: entry.999\n`;
    const html = `<pre><code class="language-fridge-magnets">${yaml}</code></pre>`;
    const result = transform(html);
    expect(result).toContain('data-field-arrangement="entry.999"');
    expect(result).toContain('data-field-board="entry.222"');
  });
});
