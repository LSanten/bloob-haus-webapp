# Interface principles (Bloob Haus wide)

The things Leon keeps tuning, written down so they hold everywhere: the haus sites, the post office,
the visualizers, and whatever comes next. Started 2026-11-14 (post office triage `246b864a`).
Broad first; narrower rules for one product live with that product and point back here.

**Standing task:** now and then, scan the designs and the feedback inbox for a rule Leon has applied
three times without it being written here, and add it. Each rule says where it came from.

## Calm

1. **One thing at a time.** While someone writes, they see the paper and the envelope and the
   button that sends it. Everything else (settings, notes about storage, file upload, extra fields)
   waits behind one quiet "more". *Leon, 2026-11-14: "serene moments when writing a letter".*
2. **Nothing moves by accident.** A tap on an object does not change it; the deliberate control
   beside it does. An irreversible act asks for a deliberate movement (three taps to tear a letter),
   not a yes/no dialog. *Steph, 2026-11-12; the tear, 2026-10-02.*
3. **Focus is a soft glow, never a hard rectangle,** and only for the keyboard. No browser blue, no
   tap flash. *Triage `1ebf1356`.*

## Objects

4. **An object appears whole,** never layer by layer, and never as raw text that becomes formatted
   a moment later. While it loads, nothing shows. *`visualizers.md` → "Appear whole"; triage
   `246b864a`.*
5. **An object looks the same at every size and zoom.** Sizes relative to the object itself
   (container units), vector lines that stay sharp, no raster grain. *Leon, 2026-11-12 and 2026-11-14.*
6. **Zooming in should not easily look bad.** Pinch in on any object and it holds up: textures are
   drawn (vector strands, SVG noise filters that re-render), not bitmaps that blur or turn to grit;
   hairlines stay hairlines. Check every new look at 300% before calling it done. *Leon, 2026-11-14.*
7. **The drawing shows the state.** Sealed, torn, opened: seen, not labelled. The words are there
   for screen readers. *2026-11-12.*
8. **The object holds only what its maker put there.** The paper of a letter holds what the writer
   typed: no greeting or signature made from the envelope. *2026-11-14.*
9. **The builder and the finished object are one drawing.** The face you write on is drawn by the
   same renderer as the object that arrives, never a second copy kept alike by hand.
   *Triage `4589062a`; `visualizers.md` → "three hosts, one renderer".*

## Words

10. **No em dashes in product copy.** Short plain sentences. A privacy note is one plain line.
11. **Say it where it matters, once.** A warning sits next to the thing it is about, at the moment
    it can still be acted on; not in a footnote, not repeated everywhere.

## Trust

12. **No third-party requests a visitor didn't choose.** System fonts or self-hosted ones, no web
    font services, no remote images in letters (a remote image is a read receipt).
13. **Build the real thing, in the real place.** URLs and flows are made the way they should finally
    look; a link sent to a person can never be migrated.
