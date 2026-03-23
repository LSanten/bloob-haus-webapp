/**
 * musings parser — pure function
 *
 * Input:  YAML string from inside a ```musings code fence.
 *         Two formats supported:
 *
 *         Format A — flat array (no limit, all cards visible):
 *           - quote: "..."
 *             name: Shannon Allison
 *             date: 01/14/2022
 *             color: red
 *
 *         Format B — object with limit and optional settings:
 *           limit: 3
 *           infinite_scroll: false   # disable Swiper loop on desktop (default: true)
 *           quotes:
 *             - quote: "..."
 *               name: ...
 *
 * Output: { items: [{quote, name, date, color}], limit: number|null, infiniteScroll: boolean }
 *
 * Pure — no DOM, no file system, no side effects.
 */

import jsYaml from "js-yaml";

const VALID_COLORS = new Set(["red", "white", "green"]);

function normalizeItem({ quote = "", name = "", date = "", color = "white" }) {
  return {
    quote: String(quote).trim(),
    name: String(name).trim(),
    date: String(date).trim(),
    color: VALID_COLORS.has(color) ? color : "white",
  };
}

export function parse(raw) {
  let parsed;
  try {
    parsed = jsYaml.load(raw.trim()) || [];
  } catch (e) {
    console.warn(`[musings] YAML parse error: ${e.message}`);
    return { items: [], limit: null };
  }

  if (Array.isArray(parsed)) {
    return { items: parsed.map(normalizeItem), limit: null, infiniteScroll: true };
  }

  if (parsed && typeof parsed === "object") {
    const items = Array.isArray(parsed.quotes) ? parsed.quotes.map(normalizeItem) : [];
    const limit = parsed.limit ? parseInt(parsed.limit, 10) : null;
    const infiniteScroll = parsed.infinite_scroll === false ? false : true;
    return { items, limit, infiniteScroll };
  }

  return { items: [], limit: null, infiniteScroll: true };
}
