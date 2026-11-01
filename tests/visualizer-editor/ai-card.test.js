/**
 * The AI card: one markdown file per visualizer, served next to its live editor
 * (bloob.haus/visualizers/<name>/ai.md), that a person can hand to any AI chat.
 */
import { describe, it, expect } from "vitest";
import { aiCard, displayName, aiIndex } from "../../lib/visualizer-editor/ai-card.js";

const base = {
  name: "services",
  description: "Two columns: a title with a sentence, and a list.",
  example: "::: services\n## What we make\n- Gardens\n:::\n",
};

describe("displayName", () => {
  it("turns a folder name into words", () => {
    expect(displayName("heading-and-paragraph")).toBe("Heading and paragraph");
  });
});

describe("aiCard", () => {
  it("names the visualizer and what it does", () => {
    const card = aiCard(base);
    expect(card.startsWith("# Services: a Bloob Haus visualizer\n")).toBe(true);
    expect(card).toContain(base.description);
  });

  it("carries a working example in a fence that survives inner ``` fences", () => {
    const card = aiCard({ ...base, example: "```quotes-stack\n- quote: hi\n```\n" });
    expect(card).toContain("````markdown\n```quotes-stack\n- quote: hi\n```\n````");
  });

  it("includes the visualizer's own guide without its title line", () => {
    const card = aiCard({ ...base, schema: "# Services\n\n## Settings\n| id | string |\n" });
    expect(card).toContain("## Settings");
    expect(card).not.toContain("# Services\n\n## Settings");
  });

  it("says plainly when there is no full guide yet", () => {
    expect(aiCard(base)).toContain("No full guide yet");
  });

  it("links to the live editor at its real address", () => {
    expect(aiCard(base)).toContain("https://bloob.haus/visualizers/services/");
  });

  it("uses no em dashes (product copy rule)", () => {
    expect(aiCard(base)).not.toContain("—");
  });
});

describe("aiIndex", () => {
  it("lists every visualizer with its card address", () => {
    const index = aiIndex([base, { ...base, name: "foldable", description: "Folds." }]);
    expect(index).toContain("- [Services](https://bloob.haus/visualizers/services/ai.md): Two columns");
    expect(index).toContain("- [Foldable](https://bloob.haus/visualizers/foldable/ai.md): Folds.");
  });
});

describe("aiCard title override", () => {
  it("uses a given title instead of the folder name", () => {
    expect(aiCard({ ...base, title: "Writing rules" }).startsWith("# Writing rules: a Bloob Haus visualizer\n")).toBe(true);
  });
});
