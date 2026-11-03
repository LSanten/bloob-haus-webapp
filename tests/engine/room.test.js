import { describe, it, expect } from "vitest";
import { renderRoom, roomNodes, nodesForUrls } from "../../lib/visualizers/_engine/room.js";

const nodes = [
  { id: "/marbles/", type: "page", title: "Marbles" },
  { id: "/marbles/a-note/", type: "page", title: "A note", shape: "note", firstLines: "The beginning of the note." },
  { id: "/marbles/glass/", type: "page", title: "Glass", subtitle: "seen through", shape: "marble", closedPicture: "/og/marble/marbles--glass.png", color: "#123456" },
  { id: "/marbles/plain/", type: "page", title: "Plain <page>", subtitle: "just words", bloobIcon: "/i.png" },
  { id: "/marbles/old/", type: "page", title: "Old", website_status: "archived" },
  { id: "/marbles/deeper/inside/", type: "page", title: "Deeper" },
  { id: "/elsewhere/x/", type: "page", title: "Elsewhere" },
  { id: "tag:x", type: "tag", title: "x" },
];
const shapes = new Map([["note", {}], ["marble", {}]]);

describe("roomNodes", () => {
  it("takes the folder's own pages: not the folder itself, deeper pages, archived pages or tags", () =>
    expect(roomNodes(nodes, "marbles").map((n) => n.id)).toEqual(["/marbles/a-note/", "/marbles/glass/", "/marbles/plain/"]));
});

describe("renderRoom", () => {
  const html = renderRoom(roomNodes(nodes, "marbles"), shapes);

  it("draws every page as its closed object, each a real link", () => {
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(html).toContain('href="/marbles/a-note/"');
    expect(html).toContain('href="/marbles/glass/"');
    expect(html).toContain('href="/marbles/plain/"');
  });

  it("a note shows its tip, a marble its glass, anything else a calm card with its icon", () => {
    expect(html).toContain("room-object--note");
    expect(html).toContain("The beginning of the note.");
    expect(html).toContain('src="/og/marble/marbles--glass-256.png"'); // the room size of the baked marble
    expect(html).toContain("room-object--card");
    expect(html).toContain("seen through"); // a marble's subtitle shows in the room too
    expect(html).toContain('src="/i.png"');
  });

  it("escapes what pages say about themselves", () => {
    expect(html).toContain("Plain &lt;page&gt;");
    expect(html).not.toContain("<page>");
  });
});

describe("nodesForUrls", () => {
  it("takes the pages a list names, in its order, skipping ones the catalog doesn't know", () =>
    expect(nodesForUrls(nodes, ["/marbles/plain/", "/nope/", "/marbles/a-note/"]).map((n) => n.id)).toEqual(["/marbles/plain/", "/marbles/a-note/"]));
});
