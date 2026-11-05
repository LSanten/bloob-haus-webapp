# Letter visualizer: first draft and Leon's comments (2026-11-04)

The draft: `2026-11-04-letter-visualizer-draft.html` beside this file (open it in a browser), also
published for comments at https://claude.ai/artifact/Yc5ARMVTDZ7yT1CZUFbA25 (private to Leon).
It replaces the post office's character-art envelope (`bloob-haus-cloud/app/src/shapes/letter/closed.ts`).
**Nothing is built in a repo yet.** Next session starts with the design questions at the bottom.

## Settled in comments (Leon, 2026-11-04 night)

- **Four pure functions**, envelope in, markup out: `renderClosed(env)`, `renderTearing(env, tears)`,
  `renderOpened(env, body, settings)` (opened, paper peeking out), `renderOpen(env, body, settings)`.
- **The peek IS the open letter**, scaled into the envelope and cut off by its opening, so they never
  differ. It shows wherever the key is: everyone in a locker. Where the post office draws without a
  key (link previews, Your lockers list) the flap is torn and the paper blank.
- **Reading:** tap the peeking letter, it slides up and out, then unfolds; tap the envelope, it slides
  back in. Re-reading never re-tears.
- **One date at a glance:** the postmark's; the written date joins it in pencil only when it is a
  different day, and stands alone before postmarking. Always at the top of the paper.
- **Stamps:** presets (no rush, open soon) or your own words (up to 30 characters) with a drawn
  picture (heart, leaf, wave, moon, sun) or an uploaded one. Light stamp shadow; the postmark has none.
- **Stickers:** upload, drag anywhere, resize; a white die-cut border follows the picture's edge.
- **Ink:** blue-black, rough edge, uneven density, blended into the paper.
- **Lots of writing:** notes grow up from the bottom edge and write smaller, names shrink to fit beside
  the stamp; never over seal, stamp or postmark; the rest is counted ("+ 6 more").
- **Greeting:** "Dear …" comes from the envelope's `to` (so the renderer knows where it ends).
- **Letter font** from a `::: settings` block in the body (`font: serif | typewriter | handwritten |
  sans`); sealed with the inside; no block = serif. Later: `paper: lined`.
- **A collection** stands newest to oldest, left to right (by postmark), newest in front.
- Rounded envelope corners: every layer is clipped to them; only the peeking paper leaves them.

## Open (bring one at a time)

1. **Where uploaded pictures live** (stickers, own stamp pictures). The outside is plaintext and
   readable by the post office; pictures are too big for the envelope's YAML. Leaning: small files
   beside the letter, named by content hash, referenced from the envelope.
2. **Lots of writing:** tap "+ N more" to see the whole outside, or let writing spill onto the flap?
3. **The locker as a container look:** 40 letters (a bundle with a count?), do unopened letters jump
   to the front, do letters you wrote look different?
4. **Where the code lives:** port into `lib/visualizers/letter/` (shapes.md says so) with the post
   office getting a compiled copy, as the engine plan says. Contract changes to write into the
   trinity docs: `renderOpened`, letter `::: settings`, stickers on the envelope.
5. Cost: showing first lines means the locker unseals every opened letter on arrival.
