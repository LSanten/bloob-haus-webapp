/**
 * Shape transforms decode data-vis-raw with Node's Buffer. In the browser the
 * editor swaps in this shim; it must agree with Node byte for byte, including
 * non-ASCII text (umlauts, emoji), or a block would render differently in the
 * editor than on the site.
 */
import { describe, it, expect } from "vitest";
import { Buffer as Shim } from "../../lib/visualizer-editor/buffer-shim.js";

const samples = ["plain", "Grüße — naïve café", "emoji 🌿🫧 and 日本語", "| a | b |\n> quote"];

describe("Buffer shim", () => {
  it.each(samples)("encodes UTF-8 to base64 exactly like Node: %s", (text) => {
    expect(Shim.from(text, "utf-8").toString("base64")).toBe(Buffer.from(text, "utf-8").toString("base64"));
  });

  it.each(samples)("decodes base64 to UTF-8 exactly like Node: %s", (text) => {
    const b64 = Buffer.from(text, "utf-8").toString("base64");
    expect(Shim.from(b64, "base64").toString("utf-8")).toBe(text);
  });
});
