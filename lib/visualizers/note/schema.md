# Note

A note on paper. It hangs from its top edge: the beginning of the note shows on the tip, the rest
is rolled up below. Click the tip or the roll to unroll it; click the roll to roll it back up. The
visitor's browser remembers which notes they opened. Clicking a link to a note inside the site
plays the unrolling on arrival.

## Activation

```yaml
---
bloob-shape: note
---
```

## What goes inside

Any markdown. A `# Heading` at the top becomes the note's title. Everything is optional.

A note with no title of its own (no `title:` and no `#`/`##` heading) opens without a heading:
it never shows a name made from its filename as if someone had written it. That name still
names the note in the browser tab, in search and in rooms.

## Settings

None yet. Planned: a handwriting font to try instead of the default.

## Outside and inside

The tip shows the beginning of the body, so it is inside data: when a note is locked or sealed,
the tip shows only its title.

## Example

```markdown
---
bloob-shape: note
---
# Why objects

A link is a promise. An object is a thing you can hold, pass on and put somewhere.
```
