# Award badge

Shows a page's awards and certifications as small wax seals with a label: an ASHRAE
Technology Award, a LEED rating, a GreenPoint rating. Facts about the whole page, so they
live in frontmatter, and a layout decides where the badge goes.

## The note (frontmatter)

Two list properties, one line per entry, read in a fixed order like a function call:

```yaml
awards:
  - ASHRAE Technology Award, Region X, 2025, 1, https://www.ashrae.org/
certifications:
  - LEED, Gold, 2023
  - GreenPoint, Platinum, 2022
```

| Key | Each line | Notes |
|---|---|---|
| `awards` | NAME, LEVEL, YEAR, PLACE, LINK | Rosette with ribbon tails. Inside: the first word of NAME ("ASHRAE") and "1st" (or the year). PLACE: `1`, `1st` or `First Place`. |
| `certifications` | NAME, LEVEL, YEAR, LINK | Round plaque with a dotted rim. Inside: the first word of NAME ("LEED") and the LEVEL ("GOLD"). Label "LEED Gold / Certified 2023". |

The icon carries the first word of NAME, so write NAME starting with the short name people
know ("ASHRAE Technology Award", "LEED", "GreenPoint"). Long words are squeezed to fit.

- Always the plural key, always a list (Obsidian gives a property one type across the vault).
  A plain string still works.
- Parts at the end can be left off. A 4-digit year and an `http(s)://` link are found in any
  position. No commas inside a part.
- Only what has been achieved. "Targeting LEED Platinum" belongs in `target`, not here.
- With a LINK, the seal and label become one link.

## How a layout places it

Build-time transforms can't read frontmatter, so the layout writes a slot that carries it:

```njk
{% if awards or certifications %}
<div class="award-badge-slot" data-style="tab" data-placement="hero"
     data-awards="{{ awards | dump | escape }}"
     data-certifications="{{ certifications | dump | escape }}"></div>
{% endif %}
```

| Slot attribute | Values | Default |
|---|---|---|
| `data-style` | `tab` (block for a hero edge), `seal` (seal + label), `line` (compact), `icon` (seals only) | `tab` |
| `data-edge` | award outline: `ribbon`, `wax`, `scallop`, `star`, `circle` (certifications are always a plaque) | `ribbon` |
| `data-placement` | any word, added as `award-badges--<word>` for theme positioning | none |

## On cards (automatic, opt-in by config)

Add `awards` and `certifications` to `graph.extra_fields` for the page type in the site yaml.
Cards drawn by `collection` (`.fp-card`) and `card-preview` (`.projects__container`) that link
to such a page then get icon seals pinned to the top-right of their image. Sites without those
fields see no change.

## Styling

Theme tokens only. Recolour the seal with `--award-seal-fill` / `--award-seal-ink`, the ribbon tails with
`--award-ribbon-fill`, the tab's seal with `--award-tab-seal`. Plaques carry a
`award-seal--level-<level>` class (e.g. `award-seal--level-gold`) for per-level colours. Labels use `--font-mono` when the theme defines it, else the body
font. Theme overrides: `themes/<theme>/assets/css/visualizers/award-badge.css`.

No JavaScript: the seal is inline SVG, the label is real text.

## Later

When a theme runs the object engine, the same parser and renderer can fill a project shape's
`closed.html` (frontmatter only, so it works for a sealed note too).
