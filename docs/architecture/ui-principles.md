# Interface principles (Bloob Haus wide)

The things Leon keeps tuning, written down so they hold everywhere: the haus sites, the post office,
the visualizers, and whatever comes next. Started 2026-11-14 (post office triage `246b864a`).
Broad first; narrower rules for one product live with that product and point back here.

**Standing task:** now and then, scan the designs and the feedback inbox for a rule Leon has applied
three times without it being written here, and add it. Each rule says where it came from.
Numbers are stable ids that other docs cite ("ui-principles #6"), so a new rule takes the next
number in whichever section it belongs to, never a renumbering.

**How to read these.** Most of these are defaults, not laws: strong, intuitive starting points. Some
will turn out to be hard rules, and we find out which ones over time. Designing against one on purpose
is fine; drifting away from one by accident is not. Each rule says how firm it is (*firm*, *default*,
*soft*, *open*) as far as we know today.

**Purpose first.** Before shaping a space, ask what it is for. The purpose shapes the space, as Priya
Parker puts it for gatherings in *The Art of Gathering*. Later this doc will grow depth per kind of
space (reading, writing, browsing, gathering); until then, name the purpose at the top of any new
design. *Leon, 2026-11-23.*

## Calm

1. **One thing at a time.** While someone writes, they see the paper and the envelope and the
   button that sends it. Everything else (settings, notes about storage, file upload, extra fields)
   waits behind one quiet "more". *Default. Leon, 2026-11-14: "serene moments when writing a letter".*
2. **Nothing moves by accident.** A tap on an object does not change it; the deliberate control
   beside it does. An irreversible act asks for a deliberate movement (three taps to tear a letter),
   not a yes/no dialog. *Firm. Steph, 2026-11-12; the tear, 2026-10-02.*
3. **Focus is a soft glow, never a hard rectangle,** and only for the keyboard. No browser blue, no
   tap flash. *Default. Triage `1ebf1356`.*
14. **What I'm touching stays under my hand.** When someone acts (starts typing, taps, hovers,
   opens something), the spot they are acting on does not move: not the line being written, not the
   field with the cursor, not the icon under the pointer. Anything new that the act brings appears
   around that spot, or grows out of it in both directions, and never pushes it away. A row of icons
   that opens on hover opens *from* the hovered icon, which stays put while the others spread out
   relative to it. *Firm. Leon, 2026-11-15: starting a new letter added a tab above the paper and
   pushed it down; the haus share bar slides the hovered icon away to reveal the others.*
17. **Things move with memory.** A thing returns to where it was, so a place builds memory over
    time: an arrangement may look organic, but underneath it is deterministic (the same notes give
    the same layout, every visit). How things move is still open: easing closed at the pace something
    opened is calm, but a snap can be right for some feels. *Open. Leon, 2026-11-23: closing felt
    "extremely fast" next to opening; "remembering where things were feels important".*

## Objects

4. **An object appears whole,** never layer by layer, and never as raw text that becomes formatted
   a moment later. While it loads, nothing shows. *Firm. `visualizers.md` → "Appear whole"; triage
   `246b864a`.*
5. **An object looks the same at every size and zoom.** Sizes relative to the object itself
   (container units), vector lines that stay sharp, no raster grain. *Default. Leon, 2026-11-12 and
   2026-11-14.*
6. **Zooming in should not easily look bad.** Pinch in on any object and it holds up: textures are
   drawn (vector strands, SVG noise filters that re-render), not bitmaps that blur or turn to grit;
   hairlines stay hairlines. Check every new look at 300% before calling it done. *Default. Leon,
   2026-11-14.*
7. **The drawing shows the state.** Sealed, torn, opened: seen, not labelled. The words are there
   for screen readers. *Default. 2026-11-12.*
8. **The object holds only what its maker put there.** The paper of a letter holds what the writer
   typed: no greeting or signature made from the envelope. *Firm. 2026-11-14.*
9. **The builder and the finished object are one drawing.** The face you write on is drawn by the
   same renderer as the object that arrives, never a second copy kept alike by hand.
   *Firm. Triage `4589062a`; `visualizers.md` → "three hosts, one renderer".*

15. **A link that leaves this subdomain opens a new tab.** Anywhere: a haus page, a letter's paper,
   a visualizer. Same host stays in the tab; `mailto:`/`tel:` hand over in place. A link opened in a
   new tab sends no referrer, so a private page's address never travels with it. Mechanism, per
   shape: `shapes.md` convention #7 (decided by origin, the current host injected so the renderer
   stays pure). *Firm. Leon, 2026-11-15.*
16. **Nothing pops in.** An object appears whole, with what is written on it, or it waits a moment
   (at most about a second and a half) and then appears. Something that truly arrives later fades
   in; it never snaps or fills in sharp. Blank paper that then gets words breaks the realism.
   (The post office: the room waits for its opened letters' first lines.) *Firm. Leon, 2026-11-19,
   feedback `580c8514`; see also "Visualizers appear whole".*
18. **Words don't re-flow while their object moves.** A label is laid out once, at its object's
    resting size, and then only grows and shrinks with it. When the layout truly changes, the old
    words fade out as the new ones fade in. Break into more lines before making type tiny.
    *Default. Leon, 2026-11-23: re-wrapping "jumps" and text got "very small sometimes". Close to
    #14 and #16.*
19. **Light, not fake volume.** No glossy highlights or gradients pretending to be 3D; light comes
    from a line and its halo, as in glassine. *Soft: today's taste, not a law (no skeuomorphism
    for now). Leon, 2026-11-23, on the MELT bubbles.*
20. **Grain is paper, not fizz.** A texture is sized to screen points, not device pixels, so it
    reads the same on a phone and a desk, and it holds still on touch screens. *Default; extends #6.
    Leon, 2026-11-23: the grain looked "fizzy" on the phone.*
21. **Let what doesn't fit fall away.** A word that doesn't fit its shape, and isn't the focus, may
    drop rather than shrink to specks. The focus always keeps its words; layers that have stepped
    back keep their shapes and let their words go. *Soft. Leon, 2026-11-23.*
22. **Leave a trace of change.** Something that moved or was taken leaves a quiet mark (where a cell
    lifted out, a perforated outline like a torn-off stamp), so a space shows the passing of time.
    *Soft, a guideline. Leon, 2026-11-23.*

## Moving through space

23. **The middle holds still.** In layered or centred navigation, every layer's centre sits on the
    same point, so going deeper never moves your eye. *Default. Leon, 2026-11-23. A case of #14.*
24. **Empty space means back, and shows it.** A click on open space goes back one step. That zone
    is visible (a soft dark fade around the content), starts close to the content so back is a
    short flick, and the cursor says so there. *Default. Leon, 2026-11-23.*
25. **Breadcrumbs remember the way you came.** Notes link in circles and one note can be reached
    many ways, so the trail is the path you took, not the folder the note sits in. The folder trail
    is a setting. Keep the path in the address, so the back button and a shared link retrace it.
    *Default. Leon, 2026-11-23.*
26. **One tap does it on a phone.** No preview tap before the real one; the thing lights up as it
    opens. *Default. Leon, 2026-11-23.*
27. **Always somewhere.** On a computer a selection always shows, like your character in a game,
    and the keys can do everything the pointer does (in a ring, the arrows walk around it
    clockwise). *Soft, being tried. Leon, 2026-11-23.*
28. **Point, don't land.** Targets are generous: a direction can choose (each cell owns a slice of
    the circle around the centre), bounded by a ring so open space stays for going back.
    *Soft, for now. Leon, 2026-11-23.*

## Words

10. **No em dashes in product copy.** Short plain sentences. A privacy note is one plain line.
    *Firm.*
11. **Say it where it matters, once.** A warning sits next to the thing it is about, at the moment
    it can still be acted on; not in a footnote, not repeated everywhere. *Default.*
29. **Hints name the gesture, not the destination.** "Scroll down or click outside to go back",
    centred under the content; the breadcrumbs already say where back leads. *Default. Leon,
    2026-11-23: "to next MELT" made no sense.*

## Trust

12. **No third-party requests a visitor didn't choose.** System fonts or self-hosted ones, no web
    font services, no remote images in letters (a remote image is a read receipt). *Firm.*
13. **Build the real thing, in the real place.** URLs and flows are made the way they should finally
    look; a link sent to a person can never be migrated. *Firm.*
30. **A dial you moved stays moved.** Settings and tuning survive reloads and updates; an update
    never silently resets them. Matters most while testing and designing artifacts. *Firm. Leon,
    2026-11-23: a republish reset the sliders he liked.*
