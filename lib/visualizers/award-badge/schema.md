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
| `awards` | NAME, LEVEL, YEAR, PLACE, LINK | PLACE: `1`, `1st` or `First Place` → seal shows "1st", label "1st Place". No place → a star. |
| `certifications` | NAME, LEVEL, YEAR, LINK | Seal shows a leaf; label "LEED Gold / Certified 2023". |

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
| `data-style` | `tab` (block for a hero edge), `seal` (seal + label), `line` (compact, for cards) | `tab` |
| `data-edge` | `wax`, `scallop`, `star`, `circle`, `ribbon` | `wax` |
| `data-placement` | any word, added as `award-badges--<word>` for theme positioning | none |

## Styling

Theme tokens only. Recolour the seal with `--award-seal-fill` / `--award-seal-ink`, the tab's
seal with `--award-tab-seal`. Labels use `--font-mono` when the theme defines it, else the body
font. Theme overrides: `themes/<theme>/assets/css/visualizers/award-badge.css`.

No JavaScript: the seal is inline SVG, the label is real text.

## Later

When a theme runs the object engine, the same parser and renderer can fill a project shape's
`closed.html` (frontmatter only, so it works for a sealed note too).
