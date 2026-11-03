import { describe, it, expect } from "vitest";
import { fillTemplate } from "../../lib/visualizers/_engine/fill.js";

describe("fillTemplate", () => {
  it("escapes values and leaves no blanks behind", () => {
    expect(fillTemplate("<h1>{{ title }}</h1>{{ nope }}", { title: "<b>" })).toBe("<h1>&lt;b&gt;</h1>");
  });

  it("escapes quotes, so values are safe inside attributes", () => {
    expect(fillTemplate('<img alt="{{ title }}">', { title: 'a"b' })).toBe('<img alt="a&quot;b">');
  });

  it("inserts body and inside as HTML", () => {
    expect(fillTemplate("{{ body }}|{{ inside }}", { body: "<p>x</p>", inside: "<i>y</i>" })).toBe("<p>x</p>|<i>y</i>");
  });

  it("reads frontmatter values through yaml.", () => {
    expect(fillTemplate("{{ yaml.mood }}", { yaml: { mood: "<calm>" } })).toBe("&lt;calm&gt;");
  });

  it("does not care about spaces inside the braces", () => {
    expect(fillTemplate("{{title}}/{{  title  }}", { title: "T" })).toBe("T/T");
  });
});
