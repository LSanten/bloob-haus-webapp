import { describe, it, expect } from "vitest";
import { renderCollectionInner } from "./renderer.js";
import { shouldPeek } from "../_engine/peek.js";

const pages = [
  { id: "/marbles/glass/", type: "page", title: "Glass", shape: "marble", closedPicture: "/og/marble/marbles--glass.png" },
  { id: "/notes/n/", type: "page", title: "A note", shape: "note", firstLines: "The beginning." },
  { id: "/about/", type: "page", title: "About" },
];

describe("display: objects", () => {
  const html = renderCollectionInner(pages, { display: "objects" });
  it("draws every page as its closed object, each a real link", () => {
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(html).toContain("room-object--marble");
    expect(html).toContain("room-object--note");
    expect(html).toContain("room-object--card");
  });
  it("a click there shows the peek first, whatever the visitor's setting", () => {
    expect(html).toContain("data-peek-always");
    expect(shouldPeek({ settingOn: false, inPeekArea: true })).toBe(true);
    expect(shouldPeek({ settingOn: false, inPeekArea: false })).toBe(false);
    expect(shouldPeek({ settingOn: true, inPeekArea: false })).toBe(true);
  });
});
