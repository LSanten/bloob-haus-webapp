import { describe, it, expect } from "vitest";
import { extractTags } from "../../scripts/utils/tag-extractor.js";

describe("working tags stay off the site", () => {
  it("to-review (Leon's own reminder) is never a public tag", () => {
    expect(extractTags({ tags: ["to-review", "yoga"] }, "a note #to-review with #ideas")).toEqual(["ideas", "yoga"]);
  });
  it("not-for-public stays hidden too", () => {
    expect(extractTags({ tags: ["not-for-public"] }, "")).toEqual([]);
  });
});
