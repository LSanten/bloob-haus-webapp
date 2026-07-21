/**
 * Scene Nav — image ref resolution (pure).
 *
 * A scene-nav element/background references its image by a *raw authored ref* —
 * a bare basename (`Contact us.png`), a vault-relative path (`media/menu-images/x.png`),
 * or an Obsidian-relative path (`../media/x.png`). Because scene-nav writes these as
 * markdown *links* `[alt](x.png)` (no leading `!`, so Obsidian doesn't embed them), the
 * general attachment resolver skips them — so scene-nav resolves them itself, here.
 *
 * Resolution is basename-first (the Obsidian model) with a path-aware attempt for refs
 * that carry a folder, then a verbatim fallback (current behaviour — never breaks an
 * already-correct ref). The raw ref stays the source of truth; only the rendered
 * <img src> gets the resolved, root-relative, URL-encoded value.
 *
 * @param {string} ref - raw image ref from the grammar
 * @param {{ byBasename?: Object, byVaultPath?: Object }} index - attachment index
 * @returns {string} resolved root-relative URL, or the ref verbatim if unknown
 */
export function resolveImageRef(ref, index) {
  if (!ref) return ref;
  // Already absolute / root-relative / data URI — leave alone.
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("/") || ref.startsWith("data:")) return ref;

  const byBasename = (index && index.byBasename) || {};
  const byVaultPath = (index && index.byVaultPath) || {};
  const decoded = decodeURIComponent(ref);
  const base = decoded.split("/").pop();
  const hasPath = decoded.includes("/");

  const tryVault = () => byVaultPath[decoded] || byVaultPath[decoded.toLowerCase()];
  const tryBase = () => byBasename[base] || byBasename[base.toLowerCase()];

  // Path refs: precise vault-path first, then basename. Bare refs: basename first.
  const resolved = hasPath ? tryVault() || tryBase() : tryBase() || tryVault();
  return resolved || ref;
}
