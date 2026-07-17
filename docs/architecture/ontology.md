# Bloob Haus Ontology

> *"Everything you can think of, nature and evolution have discovered it beforehand."* — Chris Rose

This is the **why/what** of Bloob Haus. Its companion, [`shapes.md`](shapes.md), is the **how** — the technical contract that implements what this document describes. When the two disagree, this document holds the intent and `shapes.md` holds the mechanism; reconcile them, don't let them drift.

It exists to answer the six ontological questions raised in the 2026-05-01 Engineering Review (Part 2, Section F) and to capture the conceptual model worked out across the shapes sessions. It is meant to be read in one sitting by a stranger and understood. It is the design brief the visual work expresses.

Roots: this whole project traces to Leon's 2024 Master's thesis, including an interviews with Chris rose. The conversation with Chris seeded the lanuage without my awareness until reading our interview notes again. 

---

## The founding question

> *"How do we visualize these various thresholds and liminal spaces of different people and disciplines?"* — Chris Rose, 2024

This is the north star and it predates everything else. Bloob Haus is, at root, an attempt to answer it. Every shape, every container, every closed/open state is a way of making a threshold visible — the edge between one context and another, between inside and outside, between one person's way of knowing and the next.

Hold this question above the feature list. When a decision doesn't serve it, the decision is probably weeds.

---

## Why this document is an *ontology*

> Most web systems ask: *"How do we display content?"* Bloob Haus asks: *"What is content, really, and what does it do?"*

This is the stance underneath everything, and it is why this document is named for ontology — the study of what *is* — rather than for layout or display. A blog, a CMS, a static-site generator all treat content as inert material to be arranged on a page. Bloob Haus treats content as having its own nature: a thing that exists in relation to other things, that behaves, that does something to what it touches and is changed by what touches it.

A pond is a pond. It behaves like a pond. It does what ponds do to the things that fall into them. Giving content that kind of ontological weight — the weight objects have in physics — is the move no other web system makes. Everything below (shapes, placement, metabolism, the closed/open life) is a consequence of taking this question seriously.

---

## What a shape is

A `bloob-type` (old terminology for `bloob-shape`), a `visualizer`, and an inline `:::` block are the same thing at different scopes: declarations of a **shape**. A shape is a kind of _bloob_ with its own visual identity, internal rules, and policy on what enters it. A pond, a garden, a marble, a book, a card, a map, a house, a room.

"Shape" is the right word because it carries no implementation baggage. A shape has **one core** (the saved data — the thing that *is* the marble or garden) and up to **two faces** over it: a **renderer** that turns core → visual (read mode; the *visualizer* — that is code) and an optional **builder** that turns GUI → core (write mode). Because both faces read and write the *same* core through the *same* schema, they cannot drift — the builder is a face of the shape, not a separate app. The user encounters a shape; they never see which face they are touching.

**There are two kinds of shape, and conflating them is the trap.** The one-concept story is true for *authoring* (one syntax, one mental model, one word) but the *contract* differs:

- **Leaf shapes** (renderers): transform a span of content into a visual. No contents, no placement, no metabolism, no meaningful closed state. This is almost everything built so far — `latex`, `citations`, `image-grid`, `article`, `folder-preview`.
- **Container shapes** (places): hold other shapes, have placement, metabolism, recursion, and a distinct closed state. Pond, garden, book, research-collection. **None of these exist yet.** They are the unbuilt heart of the system.

The practical consequence: don't write one 20-field contract that every shape must satisfy. Tier it — a minimal core every shape declares (identity, type, open-state renderer) plus an optional **container extension** (placement, metabolism, content policy, distinct closed state) that only container shapes fill in. See `shapes.md` for the field-level detail.

---

## The two states — and what the closed state is *for*

Every shape has two states:

- **Closed state** — the iconified, "from outside" representation. A book spine. A folded map. A potted plant. A house seen from the street. This is the shape's *calling card* in someone else's space.
- **Open state** — the expanded, "from inside" representation. The book's pages. The map laid out. The plant unfurled.

Closed-state is not a thumbnail or a link. It *is* the thing, seen from outside. The closed marble IS the open marble — same identity, two views. Identity continuity is the whole point, and it's what makes a shape different from a link or a card.

**Closed state is the soul of the system, not a detail.** Strip away the closed/open duality and recursive nesting and a "shape" is just a visualizer-plus-layout with poetic vocabulary. The keystone technical capability — still unbuilt — is rendering a `[[wikilink]]` as the target shape's closed-state visual instead of a generic pill.

What should a closed state communicate? Chris answers it:

> *"Telling what the need is first."* / *"Emotions act as a precursor to action."* — Chris Rose

> *"...be kind to your reader."* — Chris Rose

A calling card should announce the **need** — what this is, why it matters, what it's reaching for — before it announces its title or its metadata. Be kind to the reader looking at it from outside. The closed state's job is to make someone *want to open it*, and to tell them what they'll find in terms of need and feeling, not filename.

---

## Placement is the new backlink

> *"Walking side by side, what's in the ambient environment influences our communication."* — Chris Rose

This is the central reframe of Bloob Haus as a system of thought.

The networked-thought world (Zettelkasten, Roam, Obsidian) makes **the link** the unit of meaning. Meaning lives in the graph of references; the note is a node; structure is *topological* — abstract, placeless. The question is *"what links to this note?"*

Bloob Haus makes **placement** the unit of meaning. Meaning lives in *where a thing sits and what holds it*; the note is an object; structure is *topographical* — spatial, situated. The question is *"where is this note placed?"*

The same marble means something different in a pond than in a garden — not because of its backlinks, but because of the container's nature acting on it. Ambient environment influences communication, at the information level.

**The honest cost.** The graph falls out of links for free; the space does not fall out of placement for free. A link is cheap to author (`[[x]]`) and the graph self-assembles. Placement requires someone to *put things somewhere* and something to *render the arrangement*. This is why Obsidian ships a graph view and not a room view — the graph is automatic, the room is labor. "Placement is the new backlink" is true and beautiful, and it is also the reason the spatial story is hard and still unbuilt. Price the bill; don't let the beauty hide it.

---

## The context stack

Context is not one thing. It nests. Each layer answers the same question — *where am I, and what does that mean here?* — at a different scale.

```
site chrome   →  the gallery / the frame      (whose building is this?)
the haus      →  this person's whole space     (whose voice?)
the room      →  the local collection          (what's the neighborhood?)
the container →  the immediate shape           (what's acting on me right now?)
the note      →  the thing itself
```

This is the recursive-placement / scenegraph idea, but framed as **context layers**, which is the form that's useful for design rather than for coordinate math.

One consequence worth stating: **"chrome" is just the outermost layer of the context stack.** It was never a separate shapes problem — it is the same nesting seen from the top. A page's chrome preference (full / minimal / none) is a context-layer concern, not a shape-contract field.

---

## Metabolism — the last layer

> *"Molecules take on different shapes as you know things — one thing meeting something else, shape is a determining factor."* — Chris Rose

This single line is the origin of both the word "shape" and the metabolism principle. A molecule's shape changes on contact. A container's nature acts on what enters it.

**Shapes do not have constraints with rejections — they have translation functions.** A server rack landing in a garden gets flowered. A sculpture landing in a pond-of-marbles gets marbleized. The shape metabolizes its contents according to its own nature. (Full treatment in `shapes.md`.)

The membrane is where the action is:

> *"We ought to hover over boundaries to notice what the boundary is. Develop language around limitations or boundaries."* — Chris Rose

The `:::` is a membrane — a selective, active surface, not a wall. It decides what passes, transforms things as they cross, and makes the inside a different environment from the outside. The boundary itself is the design-rich surface, not the inside or the outside.

**But metabolism is the *last* layer to build, not the first.** It is the richest and most expensive thing in the system, and the foundation can ship entirely without it. The foundation's containers all *preserve* identity (the garden policy, never the pond), lay things out in flow, and never transform their contents. Metabolism — the pond marbleizing what enters it — is a cherry you build once, later, per-shape, as a delight on top of an already-useful foundation. Start small. Lay the membrane down inert; teach it to be selective later.

---

## Graceful degradation — the progression

> *"Cell division that occurs proliferates until an autopoietic identity realizes and then it stabilizes as that identity."* — Chris Rose

This is the most important engineering insight in the whole model, and it's the answer to "metabolism is too big to start." Shape is **progressive**. A space is useful at every stage of definition, and identity emerges and stabilizes over time — exactly like Chris's cell division.

Three stages of the same set of notes:

1. **Undefined pile** — a bunch of notes, laid out in flow. No shapes declared. *This works today; it is roughly what marbles-pouch already is.* "Just a bunch of notes" is a valid, shippable state.
2. **Partial definition** — some notes get shapes, some get placed. Local structure emerges. The pile starts to organize.
3. **Stabilized identity** — enough is defined that the house looks like a house. The autopoietic identity "realizes and stabilizes."

The foundation that makes this work has **zero metabolism** in it:

- a default shape for undefined notes (the pile / flow),
- one placement system — flow (order in the markdown),
- containers that preserve identity,
- nothing breaks when shapes are absent.

Nothing is ever wrong; things are only more or less defined. This is what "lay the foundation and build on it" means concretely.

---

## Configuration and content are one surface

Most systems draw a hard line: you are either writing content or configuring a component. The `:::settings` block dissolves that line. You author in one continuous surface, and some of what you write is configuration — *how a thing is represented and how it relates*, the knobs on representation and relation. (Your own gloss — "administration of the relational actions of a digital object" — is correct; trust it.)

Two halves of one idea:

- The `:::settings` block lets you turn a shape's knobs in the same breath as writing its substance — no mode switch.
- **Placement is configuration-by-position.** *Where* you drop a `:::` block configures its meaning. This is why "placement is the new backlink" and "configuration has the same feel as content" are the same idea wearing two hats.

Frontmatter stays for stable identity metadata (title, date, tags, author, `bloob-shape:`). Configuration lives in the body where the writing happens.

Two refinements, learned from `garden` (the first shape-named block — see `shapes.md` → "Shape-named blocks"):

- **The block need not be YAML.** `:::settings` is the default path for key/value knobs; a shape with a real grammar declares a shape-named block (`::: garden`) and parses it itself.
- **A full-page shape may keep identity in its body.** When a shape owns the entire page (`chrome: none`), its block *is* the whole surface — so `title`/`author` live inside the block as the single source of truth, and frontmatter carries only `bloob-shape:`. One place to hand-edit, byte-identical to what the builder writes. The frontmatter rule above holds for every shape that shares the page with prose.

---

## The six questions, answered

These are the Engineering Review's Section F questions. The answers below are the current position — written down so the visual design can express them.

**1. What is a marble?**
An object, not a page. States: closed (calling card), open (full content), hovered (preview), shared (with sender's note), embedded (chrome stripped). Data: title, body, `bloob_object` type, banner image, author, dates, tags, links, visibility. Behavior: embeddable?, commentable?, linkable-to-heading? A marble has its own nature — it exists in relation to other things, not just in relation to a viewer.

**2. What is a bloob object?**
The taxonomy that distinguishes a marble from a recipe from a project from a machine. Each type has an icon, a banner image, banner text, a default visualizer, a description. **Decision: the taxonomy is open.** Each user's `_bloob-objects.md` is their personal taxonomy. This is part of the differentiation — users name their own kinds of things.

**3. What is a connection?**
Historically: backlink, tag, mention, embed, transclusion — five reference relationships, each with a visual form (pill, tag chip, inline link, embedded card, inlined fragment). **The reframe:** the primary connection in Bloob Haus is *containment / placement*, not reference. Placement is the new backlink. Reference relationships still exist and still render (backlinks ✓, tags ✓, embeds = portability work), but the structural spine is *where things are placed*, not *what points at what*.

**4. What is a collection?**
Three modes: *folder view* (partially shipped via folder-preview), *graph view* (shipped), *space view* (the inhabitable surface — does not exist; the differentiator). **Decision: space view is the default** for a room; folder and graph are toggles. This is where the killer visualizer lives.

**5. What is the haus?**
The container for all of a user's marbles, organized into rooms (folders). **Decision: V1 is pile-on-a-surface, not a literal walled room.** The physical-room metaphor is too expensive for V1; the graph already exists; the pile is fresh, simple, and ships. The haus is what the pile stabilizes into as shapes get defined (see the progression above).

**6. What is a handle / subdomain?**
`bloob.haus/leon/` is Leon's haus. The haus contains rooms. URLs are `bloob.haus/leon/recipes/challah/`. Path-based for V1; subdomains (`leon.bloob.haus`) are a later routing rule, not a launch requirement.

---

## Design ethic — and the rule

> *"Materials tell us things if we are in contact with them. One's intention is always improved by working with materials."* — Chris Rose (via the email questions, 2024)

This is the discipline the whole model points at. The conceptual model is now over-specified in prose and under-specified in pixels. You cannot think your way to the visual form — you have to draw it. Chris said this in 2024: get in contact with the material, and your intention improves.

**The rule** (from the Engineering Review, and it still holds): *no new CSS in `themes/marbles-pouch/` until the visual primitives in this document have been drawn.* The single most clarifying drawing is **the progression** — the same set of notes at the three stages above (pile → partial → house). Draw those three frames and you have designed the core experience, proven the foundation-then-grow thesis, and sketched the killer visualizer, all in one artifact.

---

*Companion docs: [`shapes.md`](shapes.md) (the technical contract), the 2026-05-31 shapes architecture doc and mockups in the notes vault (the long-form vision), the 2026-05-01 Engineering Review (the strategic frame). Last updated: 2026-06-06.*
