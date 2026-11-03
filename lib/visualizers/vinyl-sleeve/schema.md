# vinyl-sleeve

A record sleeve with its record inside. Closed, it shows its cover. Click it and the sleeve turns
to the front, the record slides out, and the page with its music video opens below. Click again
and the record goes back in. Drag to turn the sleeve by hand.

| key | required | default | meaning |
|---|---|---|---|
| `bloob-shape` | yes | | `vinyl-sleeve` |
| `title` | yes | | the cover's title |
| `front`, `back` | yes | | square cover pictures (2250 px works well); a path next to the note or a name |
| `label` | no | a plain cream label | the record label's art |
| `start_side` | no | `back` | which side shows first: `back` or `front` |
| `vinyl_color` | no | `#0b0b0d` | the record's color |
| `youtube` | no | | the music video, shown when the record is out |

**Body:** any text, and behind-the-scenes pictures as ordinary markdown images, in order.

```markdown
---
bloob-shape: vinyl-sleeve
title: The Carbon Underground & Net-Ø
front: assets/front.png
back: assets/back.png
label: assets/label.jpg
youtube: https://www.youtube.com/watch?v=VIDEO_ID
---
Happy Halloween from Alter Engineers.

![Setting up the projector](assets/bts-01.jpg)
```
