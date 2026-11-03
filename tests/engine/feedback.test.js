import { describe, it, expect } from "vitest";
import { describePicked, feedbackBody, wishBody } from "../../lib/visualizers/_engine/feedback.js";

const picked = { tag: "p", id: "", classes: ["marble-title", "x"], text: "  How our social   systems can be considered alive and reproduce their value essences, a long title  ", path: "main > div.bloob-object > p.marble-title" };

describe("describePicked", () => {
  it("names the element by its path and a short piece of its text", () => {
    const d = describePicked(picked);
    expect(d).toContain("main > div.bloob-object > p.marble-title");
    expect(d).toContain("How our social systems");
    expect(d.length).toBeLessThanOrEqual(120);
  });
  it("an element without text is named by its path alone", () =>
    expect(describePicked({ ...picked, text: "" })).toBe("main > div.bloob-object > p.marble-title"));
});

describe("feedbackBody", () => {
  it("carries the note, the page, and what was pointed at, for the post office", () => {
    const b = feedbackBody({ kind: "idea", text: "Make this bigger", pageUrl: "https://leons.bloob.haus/marbles/a/", picked, now: "2026-11-03T05:00:00Z" });
    expect(b).toMatchObject({ kind: "idea", route: "https://leons.bloob.haus/marbles/a/" });
    expect(b.text).toContain("Make this bigger");
    expect(b.text).toContain("Pointing at: main > div.bloob-object > p.marble-title");
    expect(b.log).toEqual([{ t: "2026-11-03T05:00:00Z", kind: "picked", label: describePicked(picked) }]);
  });
  it("without a pick, it is just the note and the page", () => {
    const b = feedbackBody({ kind: "bug", text: "Broken", pageUrl: "https://x.bloob.haus/" });
    expect(b.text).toBe("Broken");
    expect(b.log).toBeUndefined();
  });
  it("an email is sent only when given", () => {
    expect(feedbackBody({ kind: "idea", text: "a", pageUrl: "u", email: " me@x.org " }).email).toBe("me@x.org");
    expect(feedbackBody({ kind: "idea", text: "a", pageUrl: "u", email: "" }).email).toBeUndefined();
  });
});

describe("wishBody", () => {
  it("a bloob object wish lands in the same pile, marked as a wish", () => {
    const b = wishBody({ text: "a vinyl record", question: "Which bloob object would you make?", pageUrl: "https://leons.bloob.haus/" });
    expect(b.kind).toBe("idea");
    expect(b.text).toBe("Bloob object wish (Which bloob object would you make?): a vinyl record");
  });
});
