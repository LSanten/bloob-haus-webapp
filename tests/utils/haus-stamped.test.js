import { describe, it, expect } from "vitest";
import { dropHausStampedKeys } from "../../scripts/utils/haus-stamped.js";

describe("dropHausStampedKeys", () => {
  it("drops the names only the haus may write", () => {
    const { frontmatter, dropped } = dropHausStampedKeys({ title: "x", opened: "2026-01-01", fetched: true, date_postmarked: "d", mark_seen: 1 });
    expect(frontmatter).toEqual({ title: "x" });
    expect(dropped.sort()).toEqual(["date_postmarked", "fetched", "mark_seen", "opened"]);
  });

  it("leaves ordinary notes alone", () => {
    const fm = { title: "x", marked: true, opening_hours: "9-5" };
    expect(dropHausStampedKeys(fm)).toEqual({ frontmatter: fm, dropped: [] });
  });
});
