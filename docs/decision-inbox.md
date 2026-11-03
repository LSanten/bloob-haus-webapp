# Decision inbox

Small decisions taken while building, so the build keeps moving and nothing gets lost. Leon goes
through this in one sitting whenever he likes; anything he changes, we change. Big, hard-to-undo
decisions never land here: they stop the build and come as one question.

One line each: **date · what was chosen · why · how hard to undo · when it matters.**
When an item is settled, delete it (git keeps the history).

## Open

- 2026-11-02 · The `image` that preprocess takes from a note's first body image counts as **inside** data (marked `image_source: body`) · so a locked note never shows a picture from its body on the outside · easy · when the post office starts drawing notes.
- 2026-11-02 · The build lives in a folder beside the repo (`bloob-haus-webapp--base-haus-26`) on the branch `base-haus-26` · your main checkout and other sessions on `main` stay untouched · trivial · until the switch.
- 2026-11-02 · Every pull request gets a preview of leons at its own address, using `bloob-haus-26` once the theme exists · see the look before it ships · easy · now.
- 2026-11-02 · Fixed `rebuild-all.yml`: it deployed leons to a Pages project named `marbles` (should be `leons`) and tried to deploy `_template` · a manual "rebuild everything" would have failed or gone to the wrong place · easy · next time someone runs it.
