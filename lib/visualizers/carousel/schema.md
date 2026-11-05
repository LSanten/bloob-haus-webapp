# Carousel

A row of photos you slide through. The centre photo is large; the ones next to it peek in
smaller at the sides, so a reader can see there are more. Each photo can have a caption.

## What this shape is

An inline (`:::`) shape for a sequence of photos that belong together: a project's before and
after, a set of posters, the steps of an install. Several carousels can sit on one page.

## Activation

```markdown
::: carousel
![[Theater.jpg]]
The Grand Ballroom mid-renovation.

![[Original Boilers 2.jpg]]
The original steam boilers. They came out during the project.

![[poster.png]]
:::
```

## What goes inside

- **Every image line starts a photo.** `![[file.jpg]]` and `![alt](file.jpg)` both work.
- **Every photo keeps its own shape** (the default). All photos are shown at the same height,
  each at its own width: a portrait photo is a narrow slide, a panorama a wide one. Nothing is
  cropped or boxed in, and the carousel never changes height while you slide.
- **Size from the first photo, as in Obsidian.** `![[poster.png|611]]` on the *first* image shows
  that photo 611px wide; the height that gives it becomes the height of every photo.
  `![[poster.png|611x400]]` means 611 wide, 400 tall. Sizes on later images are ignored. Widths
  never exceed 90% of the carousel, so phones shrink everything to fit.
- **Text lines right under an image are its caption.** A caption can wrap over several lines;
  a blank line ends it.
- **No caption is fine.** Put images on consecutive lines, or separate them with blank lines.
- Text before the first image is ignored. There are no `key: value` lines inside the block, so
  a caption like "Note: the old boilers" is always a caption.

## Settings (on the opener line)

| Key | Default | Meaning |
|---|---|---|
| `height` | `420` | Height of every photo in px, when the first image carries no size. |
| `ratio` | off | Switches to **frames**: every photo sits in the same frame shape, width / height (`3/2`, `4/3`, `1/1`…), fitted inside without cropping. Use it when you want identical slides; `\|611` on the first image then sets the frame's width. |
| `fit` | `contain` | `contain` shows the whole photo inside the frame (nothing cropped, transparency kept). `cover` fills the frame and crops. |
| `label` | `Photos` | What a screen reader calls the carousel. |
| `loop` | off | `loop=true` (or `loop=infinite`): endless in both directions. The last photo already peeks in on the left of the first, and arrows, keys and swiping wrap around. Needs 3+ photos; without JavaScript it is a plain row. |

```markdown
::: carousel
![[poster-1.png|611]]
![[poster-2.png]]
:::
```

Hovering the centre photo shows a magnifier: a click opens it full size in the site's lightbox.

## How it behaves

- **Without JavaScript:** a horizontal row that scrolls and snaps, every photo and caption
  visible as real HTML (crawlers see it all).
- **With JavaScript:** the centre photo is full size, its neighbours shrink and fade, and the
  caption shows under the centre photo only. Arrow buttons and a "3 / 6" counter appear;
  Left/Right arrow keys work when the carousel has focus; clicking a side photo brings it to
  the centre. Clicking the centre photo opens the site's lightbox (PhotoSwipe) when enabled.
- Respects `prefers-reduced-motion`.

## Images

Photos are handled like any other image on the page: the site's image optimizer resizes them
(webp plus a png fallback by default, so transparency survives) before the carousel picks
them up. The multi-megabyte original is only loaded by the lightbox.

## Content policy, width

Override: everything inside is treated as a photo or a caption. Width: `prose` (it sits in the
reading column).

## Theme overrides

`themes/<theme>/assets/css/visualizers/carousel.css`. Useful custom properties on `.carousel`:
`--carousel-slide` (centre photo width, default `66cqi`), `--carousel-ratio`,
`--carousel-side-scale` (default `0.78`), `--carousel-side-shift` (default `18%`).

## Closed-state visual

None yet (an inline shape inside a page).
