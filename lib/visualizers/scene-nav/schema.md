# Scene Nav

Interactive image-map navigation. Place transparent PNGs over a background image. Elements glow on hover and trigger actions on click.

## Activation

Place a code fence in your markdown:

````markdown
```scene-nav
background: space-background.png
elements:
  - image: bloob.png
    x: 25
    y: 30
    scale: 18
    label: "Bloob"
    glow: "#FFD700"
    action: filter
    value: "character:bloob"
```
````

Use the **scene-nav-builder** magic machine (`lib/magic-machines/scene-nav-builder/app/index.html`) to build scenes visually and generate this YAML.

## Image files

Images are referenced by filename. Place them in the same folder as your markdown file (or wherever Eleventy will copy them).

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background` | string | no | Filename of the background image |
| `elements` | array | yes | List of positioned elements |
| `elements[].image` | string | yes | Filename of the element image |
| `elements[].x` | number | yes | Horizontal position (% from left edge of container) |
| `elements[].y` | number | yes | Vertical position (% from top edge of container) |
| `elements[].scale` | number | yes | Width as % of container (height follows natural aspect ratio) |
| `elements[].label` | string | no | Tooltip text shown on hover |
| `elements[].glow` | string | no | Hex color for hover glow. Default: `"#FFD700"` |
| `elements[].glowIntensity` | number | no | Glow strength multiplier. Default: `1`. Range: 0.2–3 |
| `elements[].action` | string | yes | One of: `filter`, `link`, `anchor` |
| `elements[].value` | string | no | Tag (filter), URL (link), or element ID (anchor) |

## Action types

| Action | Behavior | `value` example |
|--------|----------|-----------------|
| `filter` | Dispatches `bloob:filter` custom event; falls back to Shopify URL filter | `character:bloob` |
| `link` | Opens URL in new tab | `https://example.com` |
| `anchor` | Scrolls to element by ID | `section-id` |

## Glow effect

Uses CSS `filter: drop-shadow()` stacked three times for a convincing glow on transparent PNGs. No canvas or image processing required — works on any image with transparency.

## Examples

Minimal:

````markdown
```scene-nav
elements:
  - image: character.png
    x: 30
    y: 40
    scale: 20
    action: filter
    value: "character:main"
```
````

Full scene with background and multiple characters:

````markdown
```scene-nav
background: room.png
elements:
  - image: bloob.png
    x: 25.5
    y: 30.2
    scale: 18
    label: "Bloob"
    glow: "#FFD700"
    glowIntensity: 1.5
    action: filter
    value: "character:bloob"
  - image: tiger.png
    x: 60.0
    y: 45.0
    scale: 22
    label: "Tiger"
    glow: "#FF6B9D"
    action: link
    value: "https://example.com/tiger"
```
````
