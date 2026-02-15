# Checkbox Tracker

Enables interactive checkboxes with persistent state. Checked/unchecked state is saved to the browser's localStorage so it persists across page reloads and visits.

## Activation

**Automatic.** Any page containing markdown task list checkboxes (`- [ ]` or `- [x]`) will activate this visualizer. No configuration needed.

## How to write content

Use standard markdown task list syntax:

```markdown
- [ ] Preheat oven to 350F
- [ ] Mix dry ingredients
- [x] Already completed step
```

Checkboxes can appear anywhere in the document — inside lists, under headings, etc. All checkboxes on a page share a single persistence scope (keyed by page URL).

## Features

- Click any checkbox to toggle it
- State persists in localStorage (survives page reload)
- Floating "Reset checkboxes" button appears when any box is checked
- 60-second undo window after resetting

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| undoWindowMs | number | 60000 | How long the undo window stays open after reset (ms) |

## Code fence

This visualizer does not use a code fence. It activates automatically on content with checkboxes.
