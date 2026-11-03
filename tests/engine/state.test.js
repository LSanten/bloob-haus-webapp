import { describe, it, expect } from "vitest";
import { decideInitialState, rememberKey, arrivedFromSite } from "../../lib/visualizers/_engine/state.js";
import { headInitScript } from "../../lib/visualizers/_engine/head-init.js";

const SITE = "https://leons.bloob.haus";
const base = { remembered: false, arrivedFromSite: false, opensOnArrival: true, hash: "" };

describe("decideInitialState", () => {
  it("an outside arrival starts closed", () => expect(decideInitialState(base)).toBe("closed"));
  it("arriving from a click plays the opening", () =>
    expect(decideInitialState({ ...base, arrivedFromSite: true })).toBe("play"));
  it("a remembered object is open from the first paint", () =>
    expect(decideInitialState({ ...base, remembered: true, arrivedFromSite: true })).toBe("open"));
  it("a #heading link opens", () => expect(decideInitialState({ ...base, hash: "#why" })).toBe("open"));
  it("an object that does not open on arrival stays closed", () =>
    expect(decideInitialState({ ...base, arrivedFromSite: true, opensOnArrival: false })).toBe("closed"));
});

describe("arrivedFromSite", () => {
  it("no referrer but a click flag still counts as arriving from the site", () =>
    expect(arrivedFromSite({ flagPath: "/marbles/x/", currentPath: "/marbles/x/", referrerOrigin: "", siteOrigin: SITE })).toBe(true));
  it("a referrer from this site counts", () =>
    expect(arrivedFromSite({ flagPath: null, currentPath: "/a/", referrerOrigin: SITE, siteOrigin: SITE })).toBe(true));
  it("another site does not count", () =>
    expect(arrivedFromSite({ flagPath: null, currentPath: "/a/", referrerOrigin: "https://example.com", siteOrigin: SITE })).toBe(false));
  it("a flag for another page does not count", () =>
    expect(arrivedFromSite({ flagPath: "/b/", currentPath: "/a/", referrerOrigin: "", siteOrigin: SITE })).toBe(false));
});

describe("rememberKey", () => {
  it("is keyed by the page id", () => expect(rememberKey("marbles/x")).toBe("bh-open:marbles/x"));
});

describe("headInitScript", () => {
  function run(script, { stored = {}, session = {}, referrer = "", path = "/a/", hash = "" } = {}) {
    const attrs = {};
    const html = { classList: { add: (c) => (attrs.class = c) }, setAttribute: (k, v) => (attrs[k] = v) };
    const storage = (o) => ({ getItem: (k) => o[k] ?? null, removeItem: (k) => delete o[k] });
    new Function("document", "localStorage", "sessionStorage", "location", script)(
      { documentElement: html, referrer },
      storage(stored),
      storage(session),
      { origin: SITE, pathname: path, hash },
    );
    return attrs;
  }
  const inner = (s) => s.replace(/^<script>|<\/script>$/g, "");

  it("marks the page as having script and starts an outside arrival closed", () => {
    const attrs = run(inner(headInitScript({ pageId: "a" })));
    expect(attrs.class).toBe("bh-js");
    expect(attrs["data-bh-initial"]).toBe("closed");
  });

  it("plays the opening after a click inside the site, and uses the flag only once", () => {
    const session = { "bh-arrive": "/a/" };
    expect(run(inner(headInitScript({ pageId: "a" })), { session })["data-bh-initial"]).toBe("play");
    expect(session["bh-arrive"]).toBeUndefined();
  });

  it("opens a remembered note from the first paint", () => {
    expect(run(inner(headInitScript({ pageId: "a" })), { stored: { "bh-open:a": "1" } })["data-bh-initial"]).toBe("open");
  });

  it("is a script tag with no network in it", () => {
    const s = headInitScript({ pageId: 'x"y' });
    expect(s.startsWith("<script>")).toBe(true);
    expect(s).not.toMatch(/fetch|XMLHttpRequest|import\(/);
    expect(s).not.toContain('"x"y"');
  });
});
