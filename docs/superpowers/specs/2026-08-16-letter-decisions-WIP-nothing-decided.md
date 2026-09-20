# The Letter — decisions to make

> # 🚧 SUPER IN PROGRESS — NOTHING HERE IS DECIDED 🚧
>
> **Read this before quoting anything below.** This is a *thinking document*, captured mid-thought.
> It is not a spec, not a plan, and not a record of decisions.
>
> **Status as of 2026-08-16: 56 items · 24 carry a suggested direction · 0 actually decided.**
>
> - Every `→ *Rec:*` is a **proposal to argue with**, not a choice that has been made. Several will
>   turn out to be wrong. The `Q` section is *deliberately* unresolved — deciding those early would
>   be guessing.
> - **Nothing here is built.** There is no `letter` shape in `lib/visualizers/`, nothing in
>   `next-steps.md`, and nothing on the roadmap. Zero lines of this exist as code.
> - Numbers, angles and inventories (`~30°`, `1024×1024`, `~12 objects`) are **placeholders to
>   react to**, not measurements anyone has validated.
> - The IDs (`W-03`, `F-18`, …) exist only so the items can be argued about by name. An ID is not a
>   commitment, and IDs may be renumbered while this is still in flux.
>
> **This is committed for safekeeping and to argue over — not to build from.** When items start
> getting decided, mark them inline and update the count above. When enough of `W` and `S` are
> settled, it graduates into a real plan under `docs/implementation-plans/` and this banner goes.

> **Update 2026-09-20 — the Spine is decided; the World and most Flows are not.** The
> Briefgeheimnis design conversation in `bloob-haus-cloud` (see
> `bloob-haus-cloud/docs/architecture/letters-and-envelopes.md` and its `DECISIONS.md` 2026-09-18/20)
> settled **S-01, S-02, S-04, S-05, S-06, S-10** and **Q-05** — marked inline below as *Decided →*.
> It also decided things this inventory didn't list: the letter body is *sealed* (encrypted) with the
> envelope plaintext; links carry the key as `#key-…`; recipients keep letters via an escrowed
> account. **One item needs a deliberate call from Leon before M3 ships: F-18 / Q-02 (read
> receipts).** The September design records `opened` as a fact so the *recipient's* envelope can be
> torn (W-11); whether the *sender* ever sees it is the values decision this doc asked to make once.
> Everything in W and the rest of F remains open, as before.

**2026-08-16.** Everything that needs deciding before the first envelope gets torn open.
Four groups: the world Whitney draws (**W**), the flows a person moves through (**F**), the
technical spine (**S**), and what stays open on purpose (**Q**). Each item has an ID so we can
argue about them by name.

This is a decision inventory, not a plan. Mark your choice inline under each item.

---

## W · World — 16 decisions

*This half is what you hand Whitney. Almost all of it is cheap to decide now and expensive to
decide after forty drawings exist.*

**W-01 — One camera register, or two?**
Objects seen *in the world* (a mailbox on a shelf) and objects *in your hands* (the letter you're
reading) want different angles. Cozy games use both and never mix them inside one scene.
→ *Rec:* two registers, named explicitly on the stencil, never mixed within a single scene.

**W-02 — The world camera angle.**
Soft three-quarter / isometric, or flat front-on storybook.
→ *Rec:* soft three-quarter, ~30°. Reads as a place you can put things into, not a picture you look at.

**W-03 — Light direction.**
One angle, fixed forever, written at the top of the stencil.
→ *Rec:* top-left, ~45°. The single biggest thing that makes forty drawings read as one world
instead of clip art.

**W-04 — Shadow style.**
Contact shadow (soft ellipse under the object), cast shadow (directional, follows the light), or none.
→ *Rec:* contact shadow on everything; cast shadow only where an object sits on a visible surface.
Contact shadows are what make a thing look like it's *resting on* something rather than floating.

**W-05 — Outline or no outline.**
And if outlined: one fixed weight, or weight that scales with object size? Scaled weight survives
zoom better but costs more attention per drawing. Put a sample on the stencil rather than words.

**W-06 — Texture register.**
Flat vector-clean, or painterly with grain and visible brush?
This decides PNG vs SVG per object more than any other choice. Painterly means raster, which means
no per-part recolouring and no colour knobs on that object.

**W-07 — The palette.**
How many core colours, and which are fixed vs theme-able (theme-able ones become CSS variables,
which is what makes colour knobs possible).
→ *Rec:* ~8 fixed + 3 theme-able. Name every swatch — those names become the variable names, so
naming them badly costs twice.

**W-08 — Artboard, grid, safe margins.**
→ *Rec:* 1024×1024 artboards, 32px grid, 64px safe margin.

**W-09 — Scale rules.**
How big is a letter relative to a mailbox, a shelf, a house? Is there a base unit?
Without this, objects drawn three months apart won't sit together.

**W-10 — Layer naming convention.**
The agreed names for anything that moves independently. This is the rule that lets Photoshop stay
in the pipeline: *anything that must move on its own is its own layer, exported on its own.*
→ *Rec:* lowercase, role-based — `body`, `lid`, `flag`, `paper`, `shadow`, `glow`. Agreed **before**
the first drawing.

**W-11 — Closed and open on every board.**
What "open" means per object type, and which objects need a third state.
→ *Rec:* the envelope needs three (sealed / torn / empty husk). Most objects need two. Draw every
state side by side on the same board, always. If states come later, everything gets redrawn.

**W-12 — Idle life.**
Which objects move while you're doing nothing. The cheapest thing that separates a webpage from a place.
→ *Rec:* two or three objects only — a curtain, a dust mote, the mailbox flag. If everything moves,
nothing feels alive.

**W-13 — The default body.**
What an object with no artwork looks like. This is the release valve for "everything has to be
drawn" — already your ontology's graceful degradation: *nothing is ever wrong, things are only more
or less defined.*

**W-14 — Typography inside the world.**
A handwriting face for letter contents? A postal/stamp face for markings? A separate UI face?
Handwriting is the difference between "a card" and "a letter."

**W-15 — Sound in v1 — yes or no, and who makes it.**
Sound is half of cozy and the half everyone skips. Also the easiest to add later without redrawing.

**W-16 — The v1 object inventory.**
Draw the letter scene end to end, not a pile of nice objects — a vertical slice tests the pipeline;
a pile of assets tests nothing.
→ *Proposed:* mailbox (closed/open, flag up/down) · envelope (sealed/torn/husk) · letter paper ·
three stamps · a photo · the shelf · the old letter box · the lens · the desk surface · one
placeholder body. ~12 objects.

---

## F · Flows — 24 decisions

### Receiving

**F-01 — How does the letter arrive?** Link in a text or email, push notification, or both.

**F-02 — First screen: mailbox or letter?**
→ *Rec:* the mailbox. The letter *arriving somewhere* is the entire feeling, and it's what makes the
haus inhabited before it's built. But it costs an account — see S-04.

**F-03 — Do you know who it's from before opening?** Sender's name on the envelope, or a surprise.

**F-04 — Which stamps exist in v1?**
Each stamp is one drawing and one piece of meaning — the first real test of "options are objects."
→ *Rec:* three — *no rush, open whenever* · *please open me soon* · none. Three feels like a choice
and is drawable this month. "None" being legitimate is what makes the default free.

**F-05 — The tear: full gesture spec.** Drag direction, distance threshold, what happens if you stop
halfway, whether it snaps back, haptics.

**F-06 — The non-gesture path.** A plain control beside the tear that just opens it. Required for
screen readers, desktop, and anyone who doesn't discover the drag.

**F-07 — What happens to the husk.** Where the torn envelope goes and when. This is how the shelf
populates without anyone filing anything.

**F-08 — Re-reading.** A torn letter opens instantly forever after; it never re-tears.
→ *Rec:* confirm. The tear is the only irreversible act in the product, and irreversibility only
feels precious in a world where nothing else can hurt you.

**F-09 — The reply prompt.** Immediately, after a beat, or only as you leave? Simultaneously the
most important moment for the product spreading and the easiest to make feel pushy.
→ *Rec:* after you've finished reading, quiet, and *as an object* — a blank sheet appearing on the
desk — not a button labelled "Reply."

**F-10 — First-time recipient with no account.** What they see, and the smallest possible ask before
they can read their letter.

### Sending

**F-11 — First screen on bloob.haus with no account.**
→ *Rec:* a blank sheet. Nothing else. "Send a letter within a minute" means writing starts before
anything is explained.

**F-12 — Write first or address first?**
→ *Rec:* write first, always. Addressing is admin, and admin never goes first — especially not at 2am.

**F-13 — What's on the desk in v1.**
→ *Proposed:* paper · the stamp drawer · a camera/scanner · the envelope · the lens.

**F-14 — The scan / photo step.** Where it lives, and whether it's offered or discovered. Phone
camera is one line of HTML; the design question is entirely *when it appears*.

**F-15 — Sealing.** A real gesture (fold, press, wax) or automatic?
Sealing is the mirror of the tear. If tearing carries the weight of receiving, sealing probably
deserves to carry the weight of committing.

**F-16 — Addressing.** Email address, copyable link, Bloob Haus handle, or all three.

**F-17 — What the sender sees after sending.** A confirmation, or the letter physically leaving?

**F-18 — Read receipts — a values decision, not a feature decision.**
→ *Strong rec:* **no, by default.** The stamp already carries urgency without surveillance —
*please open me soon* is a request, a read receipt is a measurement. It turns a gift into an
obligation, the exact opposite of the right to non-distraction. If it ever exists, make it the
recipient's choice to send a signal, never the system's.

**F-19 — Drafts.** Can you leave a half-written letter and come back? The LSD test says yes, and
says it should still be there in a week.

### Appliances & the haus

**F-20 — Where appliances live.** A shelf, a drawer, a workbench, a room.

**F-21 — How you get a new one.** Appliances are shape builders and shape builders are the
marketplace: you don't browse a directory of visualizers, you acquire an appliance for your haus.
What does acquiring look like?

**F-22 — What ships in v1.**
→ *Rec:* only the letter desk. One appliance. The pattern is proven by one working example, not five
half-built ones.

**F-23 — The lens.** Is it an object you pick up? Where does it sit when unused? What does the world
look like through it? Making the meta-tool an object too is what keeps "options are objects" honest
all the way up.

**F-24 — How deep the lens goes.** Object → its settings → its markdown source. All three, or two?
Three levels makes the lens the physical form of a value you wrote down a year ago: *show the line
between interface and code, don't blur it.*

---

## S · Spine — 10 decisions

*Built alongside the art, not after it. The letter is the backend's first customer, which is what
stops the backend from being speculative.*

**S-01 — What a letter looks like as markdown.**
Frontmatter: `bloob-shape: letter`, `from`, `to`, `sent_at`, `opened_at`, `stamp`, `state`. Body is
the letter. This file *is* the letter — the export, the archive, and the reason a modular blocky
world built here is actually forkable. Every other metaverse's save file is a proprietary blob.
*Decided 2026-09-20 →* exactly this, with one refinement: the frontmatter is the **envelope**
(plaintext: `to`, `from`, `date`, `stamp`, `bloob-shape`, a `sealed:` block) and the body is
**sealed** (ciphertext). `opened_at` / `state` are **postmarks** stamped onto the envelope as
served or exported, never written into the stored file — so the envelope's cryptographic binding
holds. Still the same markdown file; still forkable.

**S-02 — Where letters are stored.** Scaleway Object Storage, EU. Bucket layout — per user, per
haus, per conversation?
*Decided →* one bucket (`bloob-vaults`, fr-par), every file under its owner's prefix
(`{user}/{room}/file`); the post office is a system haus; a locker is a folder. The vault *is* the
haus.

**S-03 — The three endpoints.** `whoami` · `mailbox` · `deliver`. Confirm nothing else is needed for
v1 — and that these three are the same three every later feature wants.

**S-04 — Does the recipient need an account?** The biggest fork in the plan.
- *No account:* letter at an unguessable URL. Ships on today's static pipeline. No mailbox, no
  shelf, no accumulation.
- *Account:* mailbox, shelf, old letter box, a haus that fills up. The actual dream.

→ *Rec:* build the account path — it's the bottleneck you named, and it only gets good by being
lived with. But keep the unguessable-URL path permanently, as the way you write to someone who
isn't here yet. **Both, not either** — the link is how the product spreads.
*Decided →* both. The link is a **door** whose key rides in the fragment (`…#key-…`, never seen by
the server); signing in adds an **account door** (a lockbox on the recipient's ring) so the letter is
theirs on every device — escrowed by default so nothing is ever lost.

**S-05 — Jurisdiction: what runs where.**
Cloudflare is a US company, so the CLOUD Act reaches content it processes regardless of where the
bytes sit. Scaleway is French and doesn't have that exposure.
→ *Your call was right:* anything touching private letter content runs on Scaleway. Cloudflare keeps
serving public static hauses only. This moves the preview renderer off the Worker — see S-06.
*Decided →* confirmed, and stronger: private content is sealed, so even Scaleway holds only
ciphertext for link-only letters; the post-office host is Cloudflare DNS-only (grey).

**S-06 — Link preview images: where they render, and what's in them.**
*Where:* a small Scaleway container that scales to zero. Satori (HTML+CSS → PNG, no browser, fast
cold start, small image) or headless Chromium (pixel-accurate, heavy, slow to wake).
→ *Rec:* Satori in a Node container. Cheap, wakes fast, and it's the reusable render service you're
already imagining — the same container later does PDF export and thumbnails.

*What's in the image is the bigger decision.* When someone pastes the link into iMessage or
WhatsApp, **that platform** fetches the preview — so the image travels through Apple or Meta no
matter who rendered it.
→ *Rec:* **the preview IS the closed state** — an envelope, a stamp, the sender's name. Never the
message. A privacy fix and a better experience at once: it protects the surprise of tearing it open.
Your own architecture already answered this — a closed state announces the need, not the contents.

*One correction to plan around:* most platforms flatten or card-crop these images, so transparency
is unreliable. Design each preview as a complete little scene with its own background, not a cutout.
*Decided →* the preview IS the closed state, drawn **server-side from the envelope alone** by a
pure `renderClosed(envelope, state)` — the same function draws the gate page, inbox rows, and the
`og:image` (Satori). Structurally guaranteed never to contain the message: the server has no key.

**S-07 — Engine extraction.**
Which shapes must render outside Eleventy, and finishing container shapes so a shape can declare
what it contains — item 8 in `next-steps.md`. Filed as an architecture chore; it is actually the
item that turns the static site builder into the game engine. Critical path, not backlog.

**S-08 — Accessibility rules.**
Every object a real button/link with a label · every gesture has a non-gesture path ·
`prefers-reduced-motion` respected · focus always visible · the letter readable as plain text.
These are an argument *for* the DOM decision, not a tax on it — cozy wants the same things anyway.

**S-09 — PWA: when installable, and does push ship in v1?**
→ *Rec:* installable early (nearly free). Push when the mailbox exists — a letter arriving as a
notification on a home-screen icon is the moment this stops being a website.

**S-10 — The public / private boundary.**
Cloudflare Pages keeps serving public hauses; Scaleway serves everything private. Where does a
deliberately *public* letter live, and does that boundary match the existing `visibility: unlisted`
mechanism?
*Decided →* **public is plaintext and built; private is sealed and app-served** — everything private
by default, publishing is a choice. Publishing unseals (keys and doors kept, so links outlive
visibility changes); the Worker's visibility map is the switch. A public letter is just a public
page.

---

## Q · Open — 6 questions

*Left open on purpose. Deciding these early would be guessing.*

**Q-01 — Who gets the first letter?** A real person, a real occasion. Everything good here shipped
because someone was waiting — melt had Whitney and Vicki, garden had Odalys. Name the person and
most of W decides itself.

**Q-02 — Read receipts: confirmed no?** See F-18. Decide once, deliberately, then never revisit
under feature pressure.

**Q-03 — Sound in v1?** See W-15.

**Q-04 — What does the old letter box actually do?** Does it just hold, or does time do something to
what's in it? This is where the semi-automatic ordering system starts, at the smallest scale it will
ever have.

**Q-05 — Can a letter contain a marble?** A photo, a page from your haus, a whole garden. The moment
the letter stops being a greeting card and becomes part of the system — and the first real test of a
container holding another shape.
*Decided →* yes: **a door opens a thing and what it carries.** The letter's share ring holds the
keys of the photos and notes it embeds; the recipient's browser fetches them through the same door.
The send screen discloses what's carried. (Sealed *gardens* wait on a cover drawable without the body.)

**Q-06 — Photoshop or Illustrator for the moving-part objects?** Photoshop works if layers are
exported separately (W-10). Illustrator is only required where parts need runtime recolouring or
independent scaling. Whitney's comfort probably outranks the technical preference.

---

**Next:** pick Q-01, lock W-03 and W-10, and tear a grey rectangle on a phone before anyone draws
anything.
