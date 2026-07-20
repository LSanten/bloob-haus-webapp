---
bloob-settings: shapes
# ─────────────────────────────────────────────────────────────────────────────
# Canonical _bloob-shapes.md scaffold. Copy this into a content vault's root as
# `_bloob-shapes.md` and edit the table below in Obsidian.
# This file is a REFERENCE — it is not copied into any build.
#
# WHAT THIS IS: the per-shape identity + behavior registry. `bloob-shape:` in a
# note's frontmatter looks up its row here for a banner image, banner text, and a
# display name. Forward-facing successor to `_bloob-types.md` (legacy `object_type`
# column) / `_bloob-objects.md` — the reader still accepts those older files.
#
# THE REGISTRY IS OPTIONAL. With no row for a shape, banner + icon fall back to the
# theme's assets/objects/<shape>.png; the registry only ADDS banner prose, a custom
# icon, and a display name. A brand-new vault can skip this file entirely.
#
# COLUMNS:
#   bloob-shape      — identity/shape key (matches `bloob-shape:` in note frontmatter)
#   display_name     — human label (defaults to the key)
#   image            — none | default (site favicon) | [[file.png]] | /assets/objects/x.png
#   banner_text      — prose shown in the page banner
#   description      — longer text (shape catalog / banner modal)
#   fastcomments     — per-shape comment behavior (true/false, default true)
#   showvisitorcount — per-shape visitor-count behavior (true/false, default true)
#
# Optional LEGACY column (only `_bloob-types.md` vaults use it): `layout` — a per-shape
# Eleventy layout override. Omit it — layout is the shape's own job now
# (lib/visualizers/<shape>/layout.njk, else layouts/page.njk).
#
# Full reference: docs/architecture/settings-registry.md
#                 docs/architecture/themes.md  (Object Identity System)
# ─────────────────────────────────────────────────────────────────────────────
---

| bloob-shape | display_name | image | banner_text                | description | fastcomments | showvisitorcount |
| ----------- | ------------ | ----- | -------------------------- | ----------- | ------------ | ---------------- |
| page        | Page         | none  |                            |             | true         | true             |
| note        | Note         | none  | A note for you             |             | true         | true             |
| guide       | Guide        | none  | A guide for our community  |             | true         | true             |
| essay       | Essay        | none  | An essay for our community |             | true         | true             |
