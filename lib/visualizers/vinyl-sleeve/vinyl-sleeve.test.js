import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { loadTemplateShapes } from "../../../scripts/utils/template-shapes.js";
import { renderObject } from "../_engine/render.js";

const VIS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let vinyl;
beforeAll(async () => { vinyl = (await loadTemplateShapes(VIS)).get("vinyl-sleeve"); });
const data = { title: "The Carbon Underground & Net-Ø", date: "2026-10-31", front: "/media/front.png", back: "/media/back.png", label: "/media/label.jpg", start_side: "back", vinyl_color: "#0b0b0d", youtube: "https://www.youtube.com/watch?v=abc123" };
const page = (d = data) => ({ data: d, html: "<p>Happy Halloween from Alter Engineers.</p>", url: "/covers/halloween/", pageId: "h" });
const inside = '<article class="article-page"><div class="article-body"><p>Happy Halloween from Alter Engineers.</p></div></article>';

describe("the vinyl sleeve", () => {
  it("is a template shape that opens on click, shares, opens into its article and names its pictures", () => {
    expect(vinyl.draft).toBeFalsy();
    expect(vinyl.manifest).toMatchObject({ format: "template", opens: "click", shares: true, inside: "article", images: ["front", "back", "label"] });
  });

  it("closed, it is the sleeve's cover as a real picture, with its title (no script needed)", () => {
    const closed = renderObject(vinyl, page(), { inside }).split('class="bloob-object__open"')[0];
    expect(closed).toMatch(/<img[^>]*class="vinyl-cover__picture[^"]*"[^>]*src="\/media\/front.png"/); // the front is always in the HTML
    expect(closed).toContain("The Carbon Underground &amp; Net-Ø");
    expect(closed).toContain("data-bloob-toggle");
  });

  it("closed, it shows the side the 3D sleeve starts on, so nothing flashes (back by default)", async () => {
    const css = (await import("fs")).readFileSync(new URL("./styles.css", import.meta.url), "utf-8");
    const closed = renderObject(vinyl, page(), { inside }).split('class="bloob-object__open"')[0];
    expect(closed).toContain('class="vinyl-sleeve" data-start-side="back"');
    expect(closed).toMatch(/vinyl-cover__picture--back[^>]*src="\/media\/back.png"/);
    expect(closed).toMatch(/vinyl-cover__picture--front[^>]*src="\/media\/front.png"/);
    expect(css).toMatch(/\.vinyl-cover__picture--front\s*\{\s*display:\s*none/);
    expect(css).toMatch(/data-start-side="front"\][^{]*vinyl-cover__picture--front/);
  });

  it("carries what the 3D sleeve needs: both covers, the label, the start side and the record's color", () => {
    const html = renderObject(vinyl, page(), { inside });
    for (const want of ['data-front="/media/front.png"', 'data-back="/media/back.png"', 'data-label="/media/label.jpg"', 'data-start-side="back"', 'data-vinyl-color="#0b0b0d"']) expect(html).toContain(want);
  });

  it("opens into its page, with the music video", () => {
    const html = renderObject(vinyl, page(), { inside });
    expect(html).toContain('href="https://www.youtube.com/watch?v=abc123"');
    expect(html).toContain("Happy Halloween from Alter Engineers.");
  });

  it("an encrypted or locked sleeve shows only its outside", () => {
    const html = renderObject(vinyl, page(), { locked: true, inside });
    expect(html).not.toContain("Happy Halloween");
    expect(html).toContain('src="/media/front.png"');
  });
});
