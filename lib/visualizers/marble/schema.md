# marble

A glass marble. Closed, it holds its picture bent through glass (or, with no picture, its own
color). Click it and its page pours out of it, through a funnel, onto a sheet.

| key | required | default | meaning |
|---|---|---|---|
| `bloob-shape` | no | the haus's default | `marble` |
| `title` | no | the file name | shown under the marble |
| `image` | no | the first picture in the note | what the marble holds |
| `color` | no | from the picture, else steady from the title | the marble's own color |
| `inside` | no | `article` | what the marble opens into (only `article` for now) |

**Body:** the note, read as an article once the marble is open.

**Opens:** on click; arriving by a link inside the site plays the opening. Not remembered.

```markdown
---
title: Autopoiesis
color: "#7a9fd6"
---
It is quite hard to define life.
```
