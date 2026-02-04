# Decision Log

Track major architectural and technical decisions with their rationale.

---

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-29 | Hugo over Eleventy | Faster builds, single binary |
| 2026-01-29 | @flowershow/remark-wiki-link | Battle-tested, maintained |
| 2026-01-29 | Consent-first publishing | Aligns with values, prevents accidents |
| 2026-01-29 | Cloudflare for multi-user | Unlimited bandwidth, cost protection |
| 2026-01-29 | Microformats2 in templates | Low effort, IndieWeb compatibility |
| 2026-02-02 | Visualizer build-time resolution (Approach A) | Smaller payloads, fail-fast, audit trail. Runtime resolution (Approach B) doesn't scale with many visualizers |
| 2026-02-02 | Separate search-index.json and links.json | Different use cases, search needs speed, link data is larger |
| 2026-02-02 | Modular visualizer folder structure | Future-proofs for many visualizers, clear separation of concerns |
| 2026-02-03 | Cooklang-inspired syntax for recipes | Established spec, good ecosystem, human-readable, supports scaling |
| 2026-02-03 | Magic Machines as separate concept from Visualizers | Clear separation: visualizers=read/display, machines=write/transform |
| 2026-02-03 | Magic machine status tracking in frontmatter | Enables idempotent runs, auditing, and selective re-processing |
| 2026-02-03 | Flat YAML keys for magic machine status | Obsidian Properties compatibility, easier Dataview queries |

---

## How to Add Decisions

When making a significant technical or architectural decision:

1. Add a row to the table above
2. Include the date, a brief description, and the rationale
3. For complex decisions, consider adding a section below with more detail

---

## Detailed Decision Records

### Visualizer Build-time vs Runtime Resolution (2026-02-02)

**Context:** Visualizers can be resolved either at build time (Approach A) or runtime (Approach B).

**Approach A (Chosen):** Resolve during preprocessing
- Scan pages for frontmatter declarations
- Generate manifest of active visualizers per page
- Include only needed CSS/JS

**Approach B (Rejected):** Runtime auto-detection
- Include all visualizers on every page
- Each visualizer checks if it should activate

**Decision:** Approach A

**Rationale:**
- Smaller page payloads (don't load unused visualizers)
- Build fails fast if visualizer is missing
- Clear audit trail of what's active where
- Approach B doesn't scale with many visualizers

---

### Magic Machines Status Tracking Format (2026-02-03)

**Context:** Need to track which files have been processed by magic machines.

**Options considered:**
1. Nested YAML: `magic_machine_status: { machine: date }`
2. Flat keys: `mm_unit_extractor: 2026-02-03`
3. External tracking file

**Decision:** Flat YAML keys (`mm_<machine-name>: date`)

**Rationale:**
- Obsidian Properties don't display nested YAML well
- Easy to query with Dataview: `WHERE mm_unit_extractor`
- Simple to parse programmatically
- Presence of key = processed; absence = not processed
