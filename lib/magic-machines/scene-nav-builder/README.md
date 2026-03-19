# Scene Nav Builder

Visual builder for scene-nav image maps. Position transparent PNGs over a background, configure hover glow effects and click actions, and export a `scene-nav` code fence or standalone embed HTML.

**Open `app/index.html` in any browser — no build step, no server required.**

---

## What it outputs

1. **`scene-nav` code fence (YAML)** — source of truth for Bloob Haus. Paste into any Obsidian note. Re-import later to restore positions.
2. **Standalone embed HTML** — self-contained HTML/CSS/JS snippet. Drop into Shopify, any CMS, or static HTML.

---

## Basic workflow

1. Open `app/index.html` in a browser
2. Upload background image(s) and element PNGs using the buttons in the left panel
3. Drag elements to position; adjust scale, rotation, glow, and click action per element
4. Switch to **Code** mode to copy the embed or the `scene-nav` YAML
5. Re-import a saved YAML later via the **Import** tab (positions are matched by filename)

---

## Features

### Edge fade
Set the **Edge Fade** slider in the left panel to fade the background image to transparent at the canvas edges. Uses CSS `mask-image` with two intersected linear gradients (horizontal + vertical). Confirmed working on desktop and iOS Safari. The fade width is pixel-based (`edgeFadePx` in the config; slider value × 100 = pixels).

### Mobile layout
Enable **Mobile** in the left panel to define a separate layout for small screens. Set a breakpoint (px), a different aspect ratio, and independently position elements and backgrounds for mobile. The embed outputs two containers with an inline `<style>` media query to switch between them.

### Filter mode
When using the `filter` action, set **Filter Mode** to `or` (show items matching any active filter) or `and` (show items matching all active filters). Filtering is handled entirely in-embed — no external listener needed.

---

## Shopify setup (studio.bloob.haus)

### 1. Host images on Shopify CDN

Upload all PNGs (background + character sprites) to **Shopify Admin → Content → Files**.
You'll get CDN URLs like:
```
https://cdn.shopify.com/s/files/1/XXXX/files/waterdog.png
```

### 2. Set the Image Prefix in the builder

In the left panel, set **Image Prefix** to your CDN base URL, e.g.:
```
https://cdn.shopify.com/s/files/1/XXXX/files/
```
The embed will use this prefix + each filename as the `src` for every image.

### 3. Re-import your saved YAML

Paste your `scene-nav` YAML into the **Import** tab and click Apply.
Positions are matched by filename basename — the path in the YAML doesn't matter, only the filename.
The prefix you set in step 2 overrides whatever path was in the YAML.

### 4. Expose product tags in the theme

For the `filter` action to work, each product card's `<li>` must output its Shopify tags into the DOM.

In `sections/featured-collection.liquid`, the `<li>` has:
```liquid
data-tags="{{ product.tags | join: ',' }}"
```
This is already done on studio-bloob.myshopify.com (Rise theme, pushed 2026-03-06).

**Tag names must exactly match the `value` fields in your scene-nav elements** (e.g. a product tagged `waterdog` matches `value: "waterdog"`).

### 5. Add the embed to the homepage

In `templates/index.json`, add a `custom-liquid` section before `all-products`, or create a dedicated `sections/scene-nav.liquid` section with the embed code pasted in.

### 6. External filter hook (optional)

The embed dispatches a `bloob:filter` custom event on every filter change. You can listen to this for custom integrations (analytics, syncing another UI element, etc.):

```js
window.addEventListener('bloob:filter', function(e) {
  console.log(e.detail.tags);  // array of active tag values
  console.log(e.detail.mode);  // 'or' | 'and'
});
```

The embed handles all show/hide logic internally — this listener is only needed if you want to react to filter changes from outside the embed.

---

## Re-importing a YAML (returning to the builder)

1. Open the builder, upload the same image files
2. Go to **Import** tab, paste the `scene-nav` code fence, click Apply
3. The builder matches images by filename and restores all positions/settings
4. Edit as needed, then re-export the embed

---

## Filter action behaviour

| Action | What happens on click |
|--------|----------------------|
| `filter` | Toggles the element's value in the active filter set. Shows/hides `[data-tags]` items in-page. Dispatches `bloob:filter` event with `{tags, mode}`. |
| `link` | Opens `value` URL in a new tab. |
| `anchor` | Smooth-scrolls to element with matching `id` or `name`. |
