/**
 * Parse a date frontmatter field into its value and its optional inline label.
 *
 * PURE. No I/O.
 *
 * Two authoring conventions exist in the wild and both must keep working:
 *
 *   comma form (marbles, alter-engineers — what article/layout.njk assumed)
 *     date_created: 2024-11-07, Published on
 *
 *   separate-key + list form (melt — what themes/melt/layouts/page.njk assumed)
 *     date_created: 2024-11-07
 *     date_created_text: Published on
 *     date_updated:
 *       - 2026-07-27
 *       - 2026-07-23
 *
 * Article previously handled only the first, which is why adopting it on melt
 * would have silently dropped `date_updated` from 10 of 23 pages.
 *
 * Arrays pick the LATEST entry by value, not by position — the Obsidian writer
 * may prepend or append, and old lists are in arbitrary order. This mirrors
 * formatDate() so the label and the value always come from the same entry.
 *
 * @param {string|Date|Array|null} raw
 * @returns {{ value: string|Date|null, label: string|null }}
 */
export function parseDateField(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { value: null, label: null };
  }

  let value = raw;

  if (Array.isArray(value)) {
    if (value.length === 0) return { value: null, label: null };
    value = value.reduce((a, b) => (toMillis(b) >= toMillis(a) ? b : a));
  }

  // Only a string can carry an inline ", Label" suffix. A Date object cannot.
  if (typeof value === "string") {
    const idx = value.indexOf(",");
    if (idx !== -1) {
      const datePart = value.slice(0, idx).trim();
      const labelPart = value.slice(idx + 1).trim();
      return { value: datePart || null, label: labelPart || null };
    }
    const trimmed = value.trim();
    return { value: trimmed || null, label: null };
  }

  return { value, label: null };
}

/** Epoch millis for comparison; NaN when unparseable. Mirrors format-date.js. */
function toMillis(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    // Compare on the date part only, so "2026-01-02, Label" sorts correctly.
    const s = v.split(",")[0].trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T12:00:00") : new Date(s);
    return d.getTime();
  }
  return new Date(v).getTime();
}

/**
 * Resolve which label to show for a date pill.
 * Precedence: explicit `*_text` frontmatter → inline ", Label" → default.
 */
export function resolveDateLabel(explicitText, inlineLabel, fallback) {
  if (explicitText) return String(explicitText).trim();
  if (inlineLabel) return inlineLabel;
  return fallback;
}
