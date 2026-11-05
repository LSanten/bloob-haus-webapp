import { describe, it, expect } from "vitest";
import { encodeSrcset, encodeSrcsetAttributes } from "../../scripts/utils/srcset-encode.js";

describe("srcset-encode (regression: images with spaces fell back to the big PNG)", () => {
  it("encodes spaces in each candidate URL and keeps the descriptor", () => {
    expect(encodeSrcset("/media/optimized/New heat pumps-1200w.webp 1200w, /media/optimized/New heat pumps-2400w.webp 2400w"))
      .toBe("/media/optimized/New%20heat%20pumps-1200w.webp 1200w, /media/optimized/New%20heat%20pumps-2400w.webp 2400w");
  });
  it("leaves already-clean srcsets unchanged", () => {
    const s = "/media/optimized/Theater-1200w.webp 1200w, /media/optimized/Theater-2400w.webp 2400w";
    expect(encodeSrcset(s)).toBe(s);
  });
  it("handles a single candidate without a descriptor", () => {
    expect(encodeSrcset("/a b.webp")).toBe("/a%20b.webp");
  });
  it("rewrites srcset and data-pswp-srcset attributes in HTML, nothing else", () => {
    const html = '<source type="image/webp" srcset="/m/a b-600w.webp 600w"><img src="/m/a%20b-600w.png" alt="a b"><a data-pswp-srcset="/m/a b-1200w.webp 1200w">';
    expect(encodeSrcsetAttributes(html)).toBe('<source type="image/webp" srcset="/m/a%20b-600w.webp 600w"><img src="/m/a%20b-600w.png" alt="a b"><a data-pswp-srcset="/m/a%20b-1200w.webp 1200w">');
  });
});
