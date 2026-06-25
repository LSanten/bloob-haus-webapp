/**
 * Format a date value for display as "Month D, YYYY".
 *
 * Accepts:
 *  - a YYYY-MM-DD string — treated as local noon to avoid timezone rollover;
 *  - a Date object — formatted in UTC, since bare YAML dates parse to UTC
 *    midnight and would otherwise render a day early in negative-offset zones;
 *  - an array (e.g. `date_updated`) — the most recent (max) entry is chosen,
 *    independent of the list's order;
 *  - any other date-parseable value.
 *
 * Returns "" for empty/missing input.
 */
export function formatDate(value) {
  if (!value) return "";

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    // Pick the latest date by value, not by position — the writer (Obsidian
    // plugin) may prepend or append, and old lists may be in any order.
    value = value.reduce((a, b) => (toMillis(b) >= toMillis(a) ? b : a));
  }

  let d;
  let useUTC = false;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    d = new Date(value.trim() + "T12:00:00");
  } else if (value instanceof Date) {
    d = value;
    useUTC = true;
  } else {
    d = new Date(value);
  }

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(useUTC ? { timeZone: "UTC" } : {}),
  });
}

/** Convert a date value to epoch milliseconds for comparison (NaN if unparseable). */
function toMillis(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const s = v.trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T12:00:00") : new Date(s);
    return d.getTime();
  }
  return new Date(v).getTime();
}
