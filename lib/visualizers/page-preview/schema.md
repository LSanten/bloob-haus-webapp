# Page Preview

Adds a preview button (eye icon) to content links. Clicking the button opens a modal overlay showing the linked page's content without navigating away. The original link still works normally for full navigation.

## Activation

**Automatic.** This visualizer activates on any page containing elements matching these CSS selectors:

- `.recipe-card-link` — recipe cards on listing pages and the homepage
- `.tag-page-list li` — items on tag pages
- `.pagefind-ui__result` — search results (detected dynamically via mutation observer)

No configuration needed. No content authoring required.

## Features

- Eye icon button appears on hover (desktop) or as a persistent button (mobile)
- Modal overlay fetches and displays the linked page's content
- Click outside the modal or press Escape to close
- The original link still navigates normally when clicked directly

## Settings

This visualizer has no configurable settings.

## Code fence

This visualizer does not use a code fence. It activates automatically on pages with supported link elements.
