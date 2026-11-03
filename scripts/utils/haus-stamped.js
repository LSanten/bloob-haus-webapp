/**
 * Names only the haus may write: facts about an object's life (was it opened, fetched,
 * postmarked) and the reserved mark_* family. An author can't type them into a note and have a
 * page believe them (ontology.md, "three zones of writing"). The cloud reserves the same names.
 */
const STAMPED = new Set(["opened", "fetched", "date_postmarked"]);

/** @returns {{ frontmatter: object, dropped: string[] }} */
export function dropHausStampedKeys(frontmatter) {
  const dropped = Object.keys(frontmatter).filter((k) => STAMPED.has(k) || k.startsWith("mark_"));
  if (!dropped.length) return { frontmatter, dropped };
  const kept = { ...frontmatter };
  for (const k of dropped) delete kept[k];
  return { frontmatter: kept, dropped };
}
