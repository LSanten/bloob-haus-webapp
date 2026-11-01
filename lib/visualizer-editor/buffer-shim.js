/**
 * buffer-shim.js — the one slice of Node's Buffer that shape transforms use
 * (UTF-8 ⇄ base64, for data-vis-raw), for the browser bundle of the live
 * visualizer editor. Injected by esbuild in scripts/build-visualizer-editor.js;
 * never imported by a shape. Parity with Node: tests/visualizer-editor/buffer-shim.test.js.
 */
function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export const Buffer = {
  from(input, encoding = "utf-8") {
    const bytes =
      encoding === "base64"
        ? Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
        : new TextEncoder().encode(input);
    return {
      toString(out = "utf-8") {
        return out === "base64" ? bytesToBase64(bytes) : new TextDecoder().decode(bytes);
      },
    };
  },
};
