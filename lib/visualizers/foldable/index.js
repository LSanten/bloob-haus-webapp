/**
 * Foldable shape: Node host.
 *
 * Two build-time hooks, both pure underneath:
 *   markdownItPlugin  turns `## > Heading` sections into <details> while
 *                     markdown renders (fold-headings.js). eleventy.config.js
 *                     registers every visualizer that exports one.
 *   transform         fills each closed fold's peek row from the card images
 *                     rendered inside it (peek.js). Runs AFTER the other shape
 *                     transforms (transformOrder), because the cards it reads
 *                     are drawn by the collection shape's own transform.
 *
 * Opt out per site with `features.foldable_headings: false`.
 */

import { foldHeadingsPlugin } from "./fold-headings.js";
import { addFoldPeeks } from "./peek.js";

export const type = "hybrid";
export const name = "foldable";

/** Larger runs later. Every other shape keeps the default 0. */
export const transformOrder = 100;

export function markdownItPlugin(md, { siteConfig } = {}) {
  foldHeadingsPlugin(md, { enabled: siteConfig?.features?.foldable_headings !== false });
}

export function transform(html) {
  return addFoldPeeks(html);
}
