import { describe, it, expect } from "vitest";
import { parse, serializeBlock } from "./parser.js";
import { render } from "./renderer.js";
import { OVERLAY_BASE } from "./overlays.js";

const BLOCK = `::: scene-nav

- [Resources](media/menu-images/Resources.png)
\t- at: 50, 10
\t- scale: 18
\t- overlay: water
:::`;

const resolveImage = (r) => `/media/${r.split("/").pop()}`;

describe("scene-nav overlay grammar", () => {
  it("parses `overlay: <id>` onto the element", () => {
    const scene = parse(BLOCK);
    expect(scene.elements[0].overlay).toBe("water");
  });

  it("round-trips overlay through serializeBlock → parse", () => {
    const scene = parse(BLOCK);
    const round = parse(serializeBlock(scene));
    expect(round.elements[0].overlay).toBe("water");
  });

  it("leaves no overlay field when unset", () => {
    const scene = parse(BLOCK.replace("\t- overlay: water\n", ""));
    expect(scene.elements[0].overlay).toBeUndefined();
  });
});

describe("scene-nav overlay rendering", () => {
  it("adds has-overlay class + overlay CSS vars (mask = the element's own image)", () => {
    const html = render(parse(BLOCK), { resolveImage });
    expect(html).toContain("has-overlay");
    expect(html).toContain(`--snb-overlay:url('${OVERLAY_BASE}/water.gif')`);
    expect(html).toContain("--snb-overlay-mask:url('/media/Resources.png')");
    expect(html).toContain("--snb-overlay-blend:screen");
    expect(html).toContain("--snb-overlay-opacity:0.7");
  });

  it("emits no overlay markup for an unknown overlay id", () => {
    const html = render(parse(BLOCK.replace("overlay: water", "overlay: nope")), { resolveImage });
    expect(html).not.toContain("has-overlay");
    expect(html).not.toContain("--snb-overlay");
  });

  it("emits no overlay markup when overlay is unset", () => {
    const html = render(parse(BLOCK.replace("\t- overlay: water\n", "")), { resolveImage });
    expect(html).not.toContain("has-overlay");
    expect(html).not.toContain("--snb-overlay");
  });
});
