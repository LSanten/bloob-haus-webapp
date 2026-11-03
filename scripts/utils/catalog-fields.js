/**
 * What the page catalog (graph.json) says about each page beyond its title and image, so rooms
 * can draw every page as its closed object: its kind, its color, its baked picture (marbles) and
 * its first lines (public pages only; a locked page's body is not readable from outside).
 */
import { closedPicturePath } from "../../lib/visualizers/marble/paths.js";
import { defaultMarbleColor } from "../../lib/visualizers/marble/color.js";

const LOCKED = new Set(["private", "locked"]);

export function catalogFields({ effectiveShape, frontmatter = {}, url, fileName, excerpt }) {
  const fields = {};
  const locked = LOCKED.has(frontmatter.visibility);
  if (effectiveShape) fields.shape = effectiveShape;
  if (effectiveShape === "marble") {
    fields.closedPicture = closedPicturePath(url);
    fields.color = defaultMarbleColor({ color: frontmatter.color, title: frontmatter.title, fileName });
  }
  if (frontmatter.subtitle) fields.subtitle = String(frontmatter.subtitle);
  if (!locked && excerpt) fields.firstLines = excerpt;
  return fields;
}
