# Card Preview

Renders a grid of project cards from a list of wiki-links. Card data (title, image) is read from `graph.json` at build time.

## Activation

```markdown
::: card-preview limit=4 show_more=true
[[project-slug-a]]
[[project-slug-b]]
[[project-slug-c]]
:::
```

## Content

One wiki-link per line inside the container. Order is preserved.

## Settings

| Setting    | Type    | Default | Description |
|------------|---------|---------|-------------|
| `limit`    | number  | all     | Number of cards visible initially |
| `show_more`| boolean | false   | Adds "MORE PROJECTS" toggle button for hidden cards |

## Card data

Each card shows the project's title and OG image (from `graph.json`). If no image is in graph.json, the card renders without an image.

## Show more behavior

When `limit=N show_more=true`, cards beyond `limit` get classes `no-visible hidden`. The click handler in `theme.min.js` toggles them via `.projects__more-projects` button.
