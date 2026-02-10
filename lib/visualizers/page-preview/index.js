/**
 * Page Preview Visualizer — Module Entry Point
 *
 * Runtime-only visualizer that adds preview buttons to content links.
 * Clicking the button opens a modal with the page content fetched via fetch().
 * The original link still navigates normally.
 */

export const type = "runtime";
export const name = "page-preview";

// No build-time transform — all behavior is in browser.js
export function transform(html) {
  return html;
}
