# Tokens: the shared color and light names

**Status:** approved by Leon, 2026-11-02 (base haus build, Task 0). Every theme
and every visualizer uses only these names; adding one means adding it here first.

A token is a named setting, like `--bg-color`. Visualizers read the name; each theme fills in the
value, once for day and once for night (`prefers-color-scheme`). That is how a marble looks right
in leons, in melt and in the post office without knowing which one it is in.

## Kept from today's contract (no change in meaning)

`--bg-color` (the solid base behind everything), `--text-color`, `--text-light`, `--accent-color`,
`--accent-dark`, `--link-color`, `--link-hover`, `--border-color`, `--card-bg` (a surface an
object puts its content on, such as a marble's open page), `--surface-text-color` (text on that
surface), `--font-body`, `--font-heading`, `--spacing-xs` to `--spacing-xl`, `--max-width`,
`--border-radius`, `--border-radius-sm`.

What changes: they each get a night value, and `--surface-text-color` stops meaning "text on light
surfaces" and means "text on `--card-bg`", whatever color that is.

## New

| Name | What it is | Day (bloob-haus-26) | Night (bloob-haus-26) | Read by |
|---|---|---|---|---|
| `--world-1`, `--world-2`, `--world-3` | the three soft colors of the haus's background | peach `#f7cfae`, pale gold `#f6e7c4`, soft sky `#cfe1ea` | violet `#3a2d4f`, deep teal `#1c3440`, dusk base `#1b1a24` | the theme |
| `--world-glow` | the warm glow where the lamp is | none | amber `rgba(214,140,70,.45)` | the theme |
| `--light-x`, `--light-y` | where the light comes from, 0 to 1 across the screen | `1`, `0` (sun, top right) | `0.85`, `0.12` (lamp, same corner) | every object; scripts read them as numbers |
| `--light-warmth` | 0 cool daylight, 1 warm lamp | `0` | `1` | objects that tint highlights |
| `--light-level` | how brightly objects are lit, 1 = full | `1` | `0.86` | objects (paper and glass dim slightly at night) |
| `--object-paper` | natural paper | `#f6efdf` | `#f6efdf` (paper stays paper; `--light-level` dims it) | note |
| `--object-ink` | ink on paper | `#2a2118` | `#2a2118` | note |
| `--object-shadow` | the shadow an object casts, away from the light | `rgba(70,50,20,.38)` | `rgba(0,0,0,.7)` | every object |
| `--dot-color` | the dot grid | `rgba(80,55,40,.16)` | `rgba(255,235,215,.13)` | the theme |
| `--dot-warm` | dots near the cursor or a finger | rose `#d4607a` | amber `#f2b35e` | the theme |
| `--grain-strength` | the live grain, 0 to 1 | `0.07` | `0.11` | the theme |

`--card-bg` and `--surface-text-color` in bloob-haus-26: day `#fbf8f1` / `#2a2118`, night
`#1f1d26` / `#ece6dc` (Leon: a marble's open page is white by day and dark by night). Fonts:
`--font-body` Newsreader, `--font-heading` Newsreader, labels in Instrument Sans.

Not tokens: what belongs to one visualizer's own material (the marble's glass strength, its pearl
shine) stays in that visualizer as a setting.
