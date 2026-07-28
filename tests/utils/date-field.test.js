import { describe, it, expect } from "vitest";
import { parseDateField, resolveDateLabel } from "../../scripts/utils/date-field.js";
import { formatDate } from "../../scripts/utils/format-date.js";

describe("parseDateField — comma form (marbles / alter-engineers)", () => {
  it("splits date and inline label", () => {
    expect(parseDateField("2024-11-07, Published on")).toEqual({
      value: "2024-11-07",
      label: "Published on",
    });
  });

  it("handles a label containing further commas", () => {
    expect(parseDateField("2024-11-07, Written, then edited")).toEqual({
      value: "2024-11-07",
      label: "Written, then edited",
    });
  });

  it("treats a trailing comma with no label as no label", () => {
    expect(parseDateField("2024-11-07,")).toEqual({ value: "2024-11-07", label: null });
  });
});

describe("parseDateField — plain form (melt)", () => {
  it("returns the value with no label", () => {
    expect(parseDateField("2024-11-07")).toEqual({ value: "2024-11-07", label: null });
  });

  it("passes Date objects through untouched", () => {
    const d = new Date("2024-11-07T00:00:00Z");
    expect(parseDateField(d)).toEqual({ value: d, label: null });
  });
});

describe("parseDateField — list form (melt date_updated)", () => {
  it("picks the LATEST entry, not the first", () => {
    expect(parseDateField(["2026-07-23", "2026-07-27"]).value).toBe("2026-07-27");
    expect(parseDateField(["2026-07-27", "2026-07-23"]).value).toBe("2026-07-27");
  });

  it("picks the latest even when entries carry inline labels", () => {
    expect(parseDateField(["2026-01-02, Older", "2026-09-09, Newer"])).toEqual({
      value: "2026-09-09",
      label: "Newer",
    });
  });

  it("returns nothing for an empty list", () => {
    expect(parseDateField([])).toEqual({ value: null, label: null });
  });

  it("agrees with formatDate on which entry wins", () => {
    const list = ["2026-07-23", "2026-07-27", "2026-01-01"];
    expect(formatDate(parseDateField(list).value)).toBe(formatDate(list));
  });
});

describe("parseDateField — empty input", () => {
  it.each([null, undefined, ""])("returns nulls for %s", (v) => {
    expect(parseDateField(v)).toEqual({ value: null, label: null });
  });
});

describe("resolveDateLabel", () => {
  it("prefers explicit *_text frontmatter over an inline label", () => {
    expect(resolveDateLabel("From frontmatter", "Inline", "Default")).toBe("From frontmatter");
  });

  it("falls back to the inline label", () => {
    expect(resolveDateLabel(null, "Inline", "Default")).toBe("Inline");
  });

  it("falls back to the default when neither is set", () => {
    expect(resolveDateLabel(null, null, "Written on")).toBe("Written on");
  });

  it("ignores an empty explicit label", () => {
    expect(resolveDateLabel("", "Inline", "Default")).toBe("Inline");
  });
});

describe("end-to-end: both conventions render the same pill", () => {
  it("comma form and separate-key form agree", () => {
    const comma = parseDateField("2024-11-07, Published on");
    const plain = parseDateField("2024-11-07");

    expect(formatDate(comma.value)).toBe(formatDate(plain.value));
    expect(resolveDateLabel(null, comma.label, "Written on")).toBe("Published on");
    expect(resolveDateLabel("Published on", plain.label, "Written on")).toBe("Published on");
  });
});
