# Cells prototypes: notes for whoever builds it (2026-11-23)

Handoff material from the cells prototypes, reviewed with Leon on 2026-11-23. The principles that
came out of the same review are `docs/architecture/ui-principles.md` #17–#30; these are the
build notes that are not principles.

Prototypes: `Cells that grow`, `Cells in layers`, `Vault as cells` (claude.ai artifacts, private to
Leon).

- **Fonts.** The prototypes load Newsreader and JetBrains Mono from Google Fonts; that breaks
  ui-principles #12. The real build self-hosts them or uses system faces (`Vault as cells` already
  uses system faces only).
- **Cell walls.** Power diagram (weighted Voronoi) per cell, smooth-min for soft corners, a few
  rounding passes.
- **Motion.** Springs; folding cells at least critically damped. How closing should feel is still
  open (ui-principles #17).
- **Layout determinism (#17).** Ring order from a hash of each note id, turned by a hash of the
  centre, so the same notes give the same layout on every visit.
