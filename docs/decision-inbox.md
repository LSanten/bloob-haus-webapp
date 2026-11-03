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
- 2026-11-02 · The note's font stays Newsreader; a handwriting font becomes a note setting you can try in the preview · you love the current one and weren't sure about handwriting · easy · when the note is on the preview.
- 2026-11-02 · The theme's look presets are chosen with `look:` in `_bloob-settings.md` (`dawn-dusk`, `flat-warm`, `forest-light`) · you liked changing settings to get different energies · medium (a name people type) · when bloob-haus-26 lands.
- 2026-11-02 · The share bar fix (stays open while the pointer is anywhere on it) goes into the shared `_base` share bar, so melt and buffbaby get it too, and Alter Engineers on their next update · the old one closed too fast · easy · Task 11.
- 2026-11-02 · "Peek first" (open a linked object over the page before going there) is **off by default**, and "peek first" is a working name · you asked for it as a visitor setting, so the visitor turns it on · easy · Task 12b.
- 2026-11-02 · A remembered note opens instantly (no motion); only an arrival from a click plays the opening · your own memory shouldn't make you wait · easy · Task 4.
- 2026-11-02 · The day/night control is a three-way switch (auto, day, night) in the footer for now · a smooth dawn-to-dusk slider needs every color blended by one number, which belongs with the later time-of-day spectrum · easy · when the tool belt (Task 12b) arrives it moves there.
- 2026-11-02 · The marble's look was retuned from Leon's evening notes (rainbow 0.012, lighter and more see-through picture, shading, a highlight, a pearly edge drawn in code; the cloud picture is gone) · interior · tune by eye on the preview.
- 2026-11-02 · Copy image draws a card (the object, title, subtitle, full address) and copies it with the address as text; where a browser won't copy images it saves the file · interior.
- 2026-11-02 · A collection with `display: objects` draws its pages closed; a click there always shows the peek · the name `objects` is typed into notes, so renaming later means editing notes · small.
- 2026-11-02 · The image optimizer caches by file name only, so a changed image keeps its old optimized copy (marbles now skip it) · TECH-DEBT · for the repo tidy.
- 2026-11-02 · **Parked, important (Leon):** thin out which marbles are public; every marble stays shareable with a private link (a normal link plus a key, or a share link), with a login tied to Leon's Google account · this is the post office's locks and keys reaching leons · hard (a design of its own) · after this build.
- 2026-11-02 · Fixed `rebuild-all.yml`: it deployed leons to a Pages project named `marbles` (should be `leons`) and tried to deploy `_template` · a manual "rebuild everything" would have failed or gone to the wrong place · easy · next time someone runs it.
