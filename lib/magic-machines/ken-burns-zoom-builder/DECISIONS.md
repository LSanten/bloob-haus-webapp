# Ken Burns Zoom Builder — Decisions & Dev Notes

Specific technical decisions, browser quirks, and non-obvious implementation choices for this magic machine. Global architectural decisions live in `docs/implementation-plans/DECISIONS.md`.

---

## Video export pipeline

### WebCodecs + mp4-muxer (self-hosted)
- Uses the browser-native `VideoEncoder` (WebCodecs API) + `mp4-muxer` v5.1.3 (ESM, self-hosted at `vendor/mp4-muxer.mjs`).
- `mp4-muxer` is loaded lazily inside `exportVideo()` via dynamic `import()`. This requires a real HTTP server — Chrome blocks `import()` from `file://` URLs. Use `node scripts/dev-magic-machine.js ken-burns-zoom-builder` for local dev.

### Black frames — GPU canvas race condition
- `VideoFrame(HTMLCanvasElement)` reads the canvas GPU texture synchronously. On Chrome and Safari, when the canvas context is GPU-accelerated, the GPU command buffer may not be flushed at the moment of capture → black frames.
- **Fix:** force CPU software rendering: `canvas.getContext('2d', { alpha: false, willReadFrequently: true })`. This prevents the race and makes `VideoFrame` capture reliable.

### Unplayable video in QuickTime — stco chunk offset corruption
- `injectMp4Metadata()` appends a `udta` box (©too + ©cmt) *between* `moov` and `mdat`. This shifts `mdat` forward by `shift` bytes. The `stco`/`co64` chunk offset table inside `moov` stores *absolute* byte positions into `mdat` — they must be updated.
- Without the fix: `stco` still points to old offsets. QuickTime follows them and reads `moov`/`udta` bytes as H.264 NAL units → `Invalid NAL unit size` → black or unplayable video. VLC re-scans for NAL start codes so it appeared to work on Windows.
- **Fix:** `fixChunkOffsets()` walks the full `moov` box tree recursively and adds `shift` to every `stco` and `co64` entry.
- Verified with Python + ffprobe: `stco first_offset + shift === mdat_data_start`. ✓

### Second export crash on Safari
- Missing `encoder.close()` after `encoder.flush()` left the first `VideoEncoder` alive. Safari reuses internal codec resources, so creating a second encoder in the same session caused resource contention → corrupt bitstream on the second export.
- **Fix:** always call `encoder.close()` immediately after `encoder.flush()`.

---

## iOS / mobile export

### Page going blank mid-export (iPhone OOM)
- `encoder.encode()` is non-blocking — it queues frames. Without backpressure, 50+ `VideoFrame` objects pile up in memory (each ~8 MB at 1080p). iOS kills the tab when memory pressure spikes.
- **Fix:** `while (encoder.encodeQueueSize > 5) await new Promise(r => setTimeout(r, 0))` before every frame submission. This drains the encoder queue before queueing more.
- Bitrate also now scales with resolution (`2–8 Mbps`) instead of a flat `8 Mbps`.

### "Couldn't save" on iOS after export
- On iOS (Safari and Chrome-as-WebKit), `<a download>` on a Blob URL does **not** save the file. The browser opens it in a Quick Look tab instead. If the user doesn't interact within the Blob URL's revocation window (previously 5s), the file disappears.
- **Fix:** use the Web Share API (`navigator.share({ files: [...] })`) when available. This triggers the native iOS share sheet, which lets the user save to the camera roll. Falls back to `<a download>` on desktop with a 60-second Blob URL lifetime.
- `navigator.canShare({ files })` is the feature check — supported iOS 15+, Android Chrome, macOS Safari 15+.

---

## Native resolution logic

- `Native` resolution was previously `max(imageW, imageH)` — the full image size, which is unnecessarily large for tight zoom animations.
- **New behavior:** `max(startRectNativeMax, endRectNativeMax)` where `rectNativeMax = max(rect.w/100 * imageW, rect.h/100 * imageH)`. This caps the output at the source pixel extent of the larger (wider) frame. For a typical wide-start/tight-end zoom, this is significantly smaller than the full image while still matching the quality of the widest shot used.

---

## Pointer events for touch support

- Rect drag/resize was originally `mousedown/mousemove/mouseup`. Replaced with `pointerdown/pointermove/pointerup/pointercancel` + `setPointerCapture()`, which handles mouse, touch, and stylus uniformly.
- `touch-action: none` on `.rect-overlay` and `.handle` prevents the browser's scroll gesture from interfering with drag.

---

## Dev server

```bash
node scripts/dev-magic-machine.js ken-burns-zoom-builder
# → http://localhost:8090/
```

Chrome blocks dynamic `import()` from `file://` — the dev server is required for any export testing.
