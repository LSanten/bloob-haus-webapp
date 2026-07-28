# Fridge Magnets Visualizer

> ⚠️ **TECH-DEBT #40 — not yet on the pure-renderer standard.** This shape builds its markup in
> `browser.js`, so a crawler sees an empty container. Convert it the next time you touch it:
> extract a pure `renderer.js`, keep `browser.js` behavior-only, add a build-time output test.
> Reference: `lib/visualizers/collection/`. Standard: `docs/architecture/visualizers.md` →
> "The pure-renderer standard". Do not retrofit speculatively.

Interactive word-magnet board. Drag cards to compose sentences, add your own words, and (optionally) submit favorite arrangements to a shared collection via Google Forms.

---

## Basic Usage

````markdown
```fridge-magnets
cards: "[Would] [you] [park] [a] [car] [on] [a] [gas burner?]"
height: 320
```
````

### Card syntax

| Format | Effect |
|--------|--------|
| `[word]` | Card placed automatically in a row |
| `[word](x,y)` | Card placed at pixel position (x,y) |

Mix both formats in one `cards:` string.

The `⌨` toggle button at the bottom-left of every board reveals the YAML textarea so you can edit the card string directly and press **Load →** to reload.

Set `show-editor: yes` to make the textarea visible on load (useful for authoring).

---

## Add-a-Word

Every board has an **`add a word…`** input at the bottom-left. Type any text and press Enter or **+ Add**. The new card appears on the canvas with a dashed border (indicating it was added by a visitor, not from the original YAML). Visitor-added cards are draggable and selectable like native cards.

---

## Feedback Mode (Submit to Google Forms)

Turns a board into a collaborative space where visitors can submit their favorite arrangement. Setup takes about 5 minutes.

### Step 1 — Create a Google Form

Create a blank form at [forms.google.com](https://forms.google.com) and add **5 fields in this exact order**. The order matters — the code maps entry IDs to field roles by position.

| # | Field name | Type |
|---|-----------|------|
| 1 | arrangement | Paragraph (long text) |
| 2 | board | Short answer |
| 3 | type | Short answer |
| 4 | name | Short answer, not required |
| 5 | category | Short answer |

> **Sharing a form template:** If you want others to copy your form, open it in edit mode, look at the URL (`/forms/d/FORM_ID/edit`), and change `edit` → `copy`. Share that link. Anyone who opens it gets prompted to copy the form into their own account.

### Step 2 — Get the pre-filled link

This link contains the entry IDs the code needs. To get it:

1. Open your copied form in edit mode
2. Click **⋮** (top-right menu) → **Get pre-filled link**
3. Type any dummy text into each field (e.g. "A" in each)
4. Click **Get link** and copy the URL

It will look like:
```
https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111=A&entry.222=B&entry.333=C&entry.444=D&entry.555=E
```

### Step 3 — Add to your markdown

Paste the pre-filled URL as `feedback-gform-url`. The code extracts the entry IDs and POST endpoint automatically.

````markdown
```fridge-magnets
board: "My Board Title"
cards: "[Would] [you] [park] [a] [car] ..."
height: 320
feedback-allow: yes
feedback-gform-url: https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.111=A&entry.222=B&entry.333=C&entry.444=D&entry.555=E
```
````

That's it. The dummy values (`A`, `B`, etc.) in the URL are ignored — only the `entry.` key names matter.

### What gets submitted

| Field | Value |
|-------|-------|
| `arrangement` | Card positions: `[word](x,y) [word](x,y) ...` |
| `board` | The `board:` value from your YAML |
| `type` | `whole-board` or `selection` |
| `name` | Visitor's name (optional, saved in localStorage) |
| `category` | Funniest / Most informative / Other |

### Submit buttons

Two **Submit** buttons appear below the canvas:

- **Submit this board** — always visible; submits all cards at their current positions
- **Submit selection (N)** — appears when 2 or more cards are selected (click to select, lasso on empty space to group-select)

Clicking either opens a modal with a mini preview of the arrangement, a category dropdown, and an optional name field.

Submission uses `fetch` with `mode: 'no-cors'` — the browser can't confirm success, but if the POST fires without a network error, it worked. A brief confirmation toast appears after submitting.

---

## Display-Feedback Mode

Renders submitted arrangements from a Google Sheet as interactive boards, with live refresh.

### Step 1 — Open your linked sheet

Google Forms automatically creates a linked spreadsheet. Open it from the form's **Responses** tab → **View in Sheets**.

The sheet will have these columns automatically:

| Column | Source |
|--------|--------|
| `Timestamp` | Google Forms auto-fill |
| `arrangement` | Submitted card string |
| `board` | Board name from YAML |
| `type` | `whole-board` or `selection` |
| `name` | Submitter name (optional) |
| `category` | Category label |

Optionally add one manual column:
- **`approved`** — leave blank to rely on time-window moderation; write `yes` to permanently show a row; write `no` to permanently hide it.

The `Timestamp` column Google Forms writes automatically is used for time-window moderation — no manual date column needed.

### Step 2 — Make the sheet publicly readable

> **Important:** This is the Sheet's sharing, not the Form's. Google Forms has its own separate sharing dialog — do not use that one.

1. In the **Google Sheet** (not the Form), click **Share**
2. Under General access, choose **Anyone with the link**
3. Set the role to **Viewer**
4. Copy the sharing URL

### Step 3 — Add to your markdown

Paste the sheet sharing URL as `feedback-gsheet-csv`. The code converts it to a CSV export automatically.

````markdown
```fridge-magnets
mode: display-feedback
feedback-gsheet-csv: https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
feedback-moderation-hours: 24
```
````

### Moderation

Rows appear if:
- `approved` is empty **and** age < `feedback-moderation-hours` (default: 24h), OR
- `approved` is `yes`

Rows are hidden if `approved` is `no`.

### Display formats

| Submission type | Rendered as |
|-----------------|-------------|
| `whole-board` | Full interactive board (draggable, add-a-word enabled) with submitter name + category badge |
| `selection` | Compact horizontal strip of the selected cards |

### Silent refresh

The display-feedback block re-fetches the sheet every **60 seconds**. New rows are appended — existing ones are never re-rendered. After someone submits on the same page, an additional refresh fires after **5 seconds**.

---

## All YAML Fields

| Field | Default | Description |
|-------|---------|-------------|
| `cards` | `""` | Card string: `[text]` or `[text](x,y)` |
| `height` | `280` | Canvas height in pixels |
| `board` | `""` | Board name — auto-submitted as metadata |
| `show-editor` | `no` | Show YAML textarea on load (`yes`/`no`) |
| `feedback-allow` | `no` | Enable submit buttons |
| `feedback-gform-url` | `""` | Any Google Forms URL (share link, pre-filled link, or formResponse URL) |
| `feedback-fields` | — | Optional override for entry IDs if your field order differs from the template |
| `mode` | `""` | Set to `display-feedback` to render submissions |
| `feedback-gsheet-csv` | `""` | Any Google Sheets URL (sharing link or export URL) |
| `feedback-moderation-hours` | `24` | Hours before unapproved rows auto-hide |

---

## Custom Card Syntax (`+` prefix)

When a visitor adds a word via the add-a-word input, it's stored with `custom: true` and shown with a dashed border. In arrangement strings, custom cards carry a `+` prefix:

```
[Would](0,0) [you](70,0) [+fridge](140,0)
```

The display-feedback renderer detects `+` prefixed cards and applies the dashed border automatically.

---

## Phone Usability

The current implementation uses mouse events. Touch events (for mobile drag, lasso, etc.) are planned for a future pass. The add-a-word input, submit buttons, and modal all work on touch devices via native browser behavior. Drag and lasso require a mouse or stylus.
