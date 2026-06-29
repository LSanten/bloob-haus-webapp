# Article shape — decisions

## 2026-06-29 — Tokenize font sizes (with current values as fallbacks)

**Decision:** Replace the hardcoded `font-size` / body `line-height` values in `styles.css`
with `var(--article-*-size, <original value>)` tokens. The fallback in each `var()` is the
exact value that was previously hardcoded.

**Why:**
- The shape only tokenized *width* and *colors*; every font size was baked in. Themes had no
  clean knob to tune reading size — they'd have had to override `.article-*` selectors.
- Apparent text size is typeface-dependent. A face with a tall x-height (e.g. Satoshi on
  alter-engineers) reads larger than its nominal `1rem`, so a fixed `1rem` body looked too big
  on that theme while being right on others.

**Backward compatibility:** Because every `var()` carries the original value as its fallback,
any theme that sets none of the new tokens renders **byte-for-byte identical** to before. The
tokens are additive and optional — no theme is required to define them.

**Token set:** `--article-title-size`, `--article-subtitle-size`, `--article-body-size`,
`--article-body-line-height`, `--article-h1-size` … `--article-h6-size`. Documented in
`docs/architecture/themes.md` ("Article-shape sizing tokens") and
`docs/architecture/settings-registry.md`.

**`--article-body-line-height` applies to both `p` and `li`** but with different fallbacks
(`1.7` for `p`, `1.65` for `li`) so unset themes keep their prior look, while a theme that
sets the token gets consistent leading across both.
