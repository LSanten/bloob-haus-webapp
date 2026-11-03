# callout

A quote that starts with `[!type]` becomes a callout: a soft box with a title, tinted by its kind.
The same syntax as Obsidian and GitHub, so it reads the same there.

| key | meaning |
|---|---|
| `> [!type]` | the kind: note, tip, question, warning, danger, success, quote, example... |
| rest of that line | the title (else the kind, capitalised) |
| the lines after | the body: text, lists, images, even raw HTML |

```markdown
> [!question] Which bloob object would you make?
> A record, a recipe card, a map...
```

An ordinary `>` quote stays a quote.
