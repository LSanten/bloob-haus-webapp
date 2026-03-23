# Testimonials

Renders a Swiper carousel of testimonial quotes. Each blockquote in the container becomes one slide. The Swiper instance is initialized at runtime by `theme.min.js`.

## Activation

Place a `:::` container in your markdown:

```markdown
::: testimonials

> Quote text goes here. Can span multiple lines within the blockquote.
>
> ~ name: Person Name
> ~ role: Their Role or Organization

> A second testimonial quote.
>
> ~ name: Another Person
> ~ role: Another Role

:::
```

## Format

Each testimonial is a **blockquote** (`>`) block:
- Quote text: any non-`~` lines inside the blockquote
- Metadata: lines starting with `~ key: value` inside the blockquote
- Multiple testimonials: separate blockquotes with a blank line (no `>` prefix)

## Metadata fields

| Field | Required | Description |
|-------|----------|-------------|
| `~ name:` | No | Speaker name — appears in the attribution line |
| `~ role:` | No | Role or organization — appended to name with a comma |

## Container settings

None currently. The section heading ("TESTIMONIALS") and Swiper navigation are always rendered.

## Output structure

Matches the `.testimonials` BEM layout from `theme.min.css`:

```html
<section class="testimonials">
  <div class="testimonials__wrapper maxwidth">
    <div class="testimonials__top-section">
      <p class="label testimonials__title">TESTIMONIALS</p>
      <div class="testimonials__buttons">
        <div class="testimonials__prev-button" ...></div>
        <div class="testimonials__next-button" ...></div>
      </div>
    </div>
    <div class="swiper testimonials__container" id="testimonials">
      <div class="swiper-wrapper">
        <div class="swiper-slide testimonials__content">
          <h2 class="h2-medium testimonials__testimonial">Quote text</h2>
          <h3 class="testimonials__name">—  Name, Role</h3>
        </div>
      </div>
    </div>
  </div>
</section>
```

## Obsidian preview

In Obsidian, the `:::` container renders as a visible block with the blockquotes displayed inline — each quote is readable in the vault without any plugin required.
