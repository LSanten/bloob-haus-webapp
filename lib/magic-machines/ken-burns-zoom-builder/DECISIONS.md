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

### "No supported H.264 codec found" — swallowed TDZ error
- **Symptom:** every export threw `No supported H.264 codec found in this browser`, on all OSes (first reported on Windows). Looked like a hardware codec gap; it wasn't.
- **Root cause:** the codec-probe loop called `VideoEncoder.isConfigSupported({ …, bitrate })` while `const bitrate` was declared *below* the loop. Reading a `const` before its declaration throws a `ReferenceError` (temporal dead zone), which an empty `catch {}` swallowed — so all candidates "failed" and `codec` stayed `null`.
- **Fix:** declare `bitrate` *above* the probe loop; log probe failures instead of `catch {}`.
- **Also fixed alongside:** `computeOutputSize()` could return fractional/odd dimensions (export ran at `3016.712×3018`). H.264 needs even *integers* → floor each side with `Math.floor(x/2)*2`. And added a `hardwareAcceleration: 'prefer-software'` fallback pass for large/near-square frames that Windows hardware encoders reject.
- **Lesson:** never use a bare `catch {}` around codec/feature probing — it hides real bugs. Always `dbg()` the caught error.

### 4096×4096 export fails — H.264 frame-size ceiling
- **Symptom:** `No supported H.264 codec found for 4096×4096 @ 30fps`, while 3034×3034 and 4096×2304 export fine. It is the *resolution*, not the framerate.
- **Cause:** browsers expose at most H.264 **Level 5.2**, whose max frame size is **36,864 macroblocks** (≈9.4 MP — e.g. 4096×2304 or 3072×3072). A 4096×4096 square is **65,536 macroblocks**, needing Level 6.x, which neither Mac VideoToolbox nor Chrome's software encoder (OpenH264) provides.
- **Fix:** `computeOutputSize()` clamps total area to `3072×3072` (= the Level 5.2 budget), scaling proportionally and preserving aspect ratio. It returns a `clamped` flag; `exportVideo()` shows a footnote (`⚠ Capped to NxN`) so the reduction is visible, not silent. The `res-desc` UI label also reflects the capped size before export.
- Note: 4096×2304 (16:9) is *not* penalized — it equals the budget exactly. Only oversized frames (tall/square at 4096) get scaled.

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

### Download vs Share — separate buttons (don't auto-prefer share)
- **Problem:** the original code preferred Web Share *whenever* `navigator.canShare({files})` was true. That check now passes on desktop Chrome (Windows) and macOS too, so every export opened the OS share sheet and there was **no way to just save the .mp4 to disk** — desktop users were stuck (share sheet only offers "Copy"/apps, not "Save").
- **Fix:** two explicit buttons. `exportVideo(mode)` takes `'download'` (default — primary button, always `<a download>` to disk) or `'share'` (secondary button — Web Share sheet). The Share button is feature-detected at load (`shareSupported`) and stays hidden when files can't be shared, so Windows/Linux desktop sees Download only.
- Share-sheet dismissal rejects with `AbortError` — caught and treated as a no-op, not an export failure.

### Saving to the iOS Photo Library — encode cache + "armed" Save button
- **Problem:** on iPhone, `<a download>` can only reach Files/Drive, never Photos. The only web route to the Photo Library is the share sheet's "Save Video". But `navigator.share()` needs a live user gesture that Safari expires **~5s** after the tap — and a full encode often takes a **minute or more**. So you can *never* call `share()` at the end of a long encode; the gesture is long gone.
- **Fix (two-phase, gesture-safe for any encode length):**
  1. Cache the last encode keyed by `outputStateKey()` (everything affecting the frames) in `lastEncode = {key, blob, filename}`.
  2. On a Share tap with a **warm** cache, `deliver()` calls `share()` synchronously inside that tap's fresh gesture → iOS shows "Save Video" in one tap.
  3. On a **cold** cache the tap renders; when the encode finishes the gesture has usually expired, so instead of a doomed `share()` or a silent Files download, we **arm the Share button**: `armShareSave()` turns it into a pulsing accent-colored **"Save to Photos"** button. The user's next tap is a *fresh* gesture, the cache is now warm, and `share()` fires instantly → "Save Video".
- **Why an explicit armed button, not just a footnote:** the old approach only flashed "tap Share again" in the footnote — easy to miss after staring at a 60s+ progress bar. The button itself now changes label + pulses, so the second tap is obvious. `refreshShareButton()` (called from `updateSummary()`) disarms it the moment any setting changes, so "Save to Photos" never points at a stale render.
- `deliver(mode, blob, filename)` is the single delivery path for both buttons and both the cached fast-path and post-encode path. `armShareSave()`/`disarmShareSave()` own the button state. Keeps share/download logic in one place.

### Share sheet shows only "Save to Files"/Drive — never "Save Video" (title field)
- **Symptom:** on iPhone the Share button opened the share sheet, but it only offered "Save to Files" / Google Drive / app targets — never "Save Video" (the only route to Photos/Camera Roll). The MP4 was already a valid faststart H.264 (`fastStart: 'in-memory'`), so the container wasn't the problem.
- **Cause:** the share call passed `title: 'Ken Burns Animation'` alongside `files`. On iOS, including any of `title`/`text`/`url` next to `files` makes the share sheet treat the payload as a *generic content share* and **suppresses the media-specific "Save Video"/"Save Image" action**. Sharing the file *alone* makes iOS recognize it as a video and surface "Save Video" → Photos.
- **Fix:** `navigator.share({ files: [file] })` — files only, no title/text/url.
- Note: our feature-probe (`shareSupported`) already used `canShare({ files })` only; only the real share call carried the stray `title`.

### Save feedback UX — progress + two-step + success toast
- **Problem:** even with Save-to-Photos working, the flow felt opaque: a long silent render, an easy-to-miss "tap again" hint, and no confirmation it saved.
- **Fix (three feedback layers, grounded in standard mobile UX guidance):**
  1. **Determinate progress** during the encode: headline carries the **percentage** ("Rendering your video… 62%"), sub-line shows **estimated time remaining + frame count** ("~12s left · frame 112/180"). Fill smooths to 96% during frames, 98% at finalize, 100% at delivery — so it never stalls at "done" then jumps. ETA is computed from measured pace after 3 frames, throttled to ~2 Hz.
  2. **Guided two-step button:** idle "Save to Photos" → disabled "Rendering…" → armed pulsing **"✓ Ready — Tap to Save"** (action-oriented label, not just "Save to Photos") → brief **"✓ Saved" success state** before reverting. Makes the required second tap unmistakable.
  3. **Success toast** (`showToast()`): one-line, bottom-center, fades after ~3s. "✓ Saved to Photos" on share, "✓ Saved to Files"/"✓ Video downloaded" on download, plus the arming hint and export-failure toast.
- `showToast()` reuses a single fixed-position element; `showShareSuccess()` owns the post-share success state. The `finally` in `exportVideo()` only clears the transient "Rendering…" label so armed/"✓ Saved" states survive.

### On iOS, "Save to Photos" must be the *primary* button
- **Symptom:** a user on Chrome-for-iOS tapped the big orange **Download Video** button expecting it to save to the camera roll; it opened Chrome's Files saver instead (log ended at `Saving file via download`, no share path). The route to Photos (Share → "Save Video") was the *secondary* button and got ignored.
- **Cause:** the default layout makes Download primary (works on every platform) and Share secondary. That's right for desktop, wrong for iOS — where download literally cannot reach Photos.
- **Fix:** `isIOS` detection (UA `iPhone/iPad/iPod` + iPadOS-as-Mac `MacIntel && maxTouchPoints>1`, covers Chrome-for-iOS since it's WebKit/UA still says iPhone). On iOS, `promoteShareForIOS()` swaps the classes so **"Save to Photos"** is the primary button, relabels Download to **"Download to Files"**, and reorders Save-to-Photos to the top. `shareIdleLabel` holds the platform resting label so arm/disarm restore the right text.

### Web Share fails after a slow encode — `NotAllowedError` (gesture expired)
- **Symptom:** `navigator.share()` threw `NotAllowedError: Must be handling a user gesture` — but only sometimes. It worked on a 4.6s Windows encode and failed on a 5.8s Mac encode of the same kind of image.
- **Cause:** Web Share requires *transient user activation*, which Chrome expires **~5 seconds** after the click. Encoding happens between the button click and the `share()` call, so a long encode outlives the activation window and the share is blocked.
- **Fix:** on `NotAllowedError` we no longer download silently — we `armShareSave()` (see "encode cache + armed Save button" above). The file is cached, so the next tap fires `share()` in a fresh gesture and reaches Photos. The dedicated Download button remains the gesture-free path for Files/disk. (We can't keep one gesture alive across a multi-second/minute encode — arming the button is the reliable substitute.)

---

## Per-image settings + native aspect-ratio default

- **Default AR = the image's own ratio.** On loading an *unseen* image, `setNativeAspectRatio()` reduces `imageW:imageH` by GCD to small ints, activates the matching preset button (1:1 / 9:16 / 16:9 / 4:3) or fills the custom inputs otherwise, then frames the crop rects to that ratio. Nothing is cropped by default.
- **Per-image persistence keyed by filename.** `saveImageSettings()` writes `{ar, arW, arH, customArW, customArH, start, end}` to `localStorage['kb-img:'+filename]` on every rect drag/resize and AR change. `loadImage()` restores it when the same filename is re-uploaded — and crucially does **not** re-apply the AR on restore (that would reshape the saved rects); it restores them verbatim.
- This replaced the old global `kb-rect-start` / `kb-rect-end` keys, which shared one framing across all images. Both START and END rect position+size are saved.
- `outputStateKey()` (used by the encode cache) includes `imageName`, so switching images invalidates the cached video.

## Live-preview timeline drives off the engine, not wall-clock

- **Bug:** the preview's seconds counter climbed forever and the orange bar never reset, because the builder's `onTick` used `getElapsedSec()` (monotonic `performance.now()` accumulation) for the display.
- **Fix:** drive the timeline from the engine's own normalized position `t` (0..1), which already resets to 0 on `loop`, stops at 1 on `hold`, and ping-pongs on `bounce`. Time shown = `t * state.duration`; bar = `t * 100%`. The wall-clock helpers remain only for play/pause/seek bookkeeping.

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
