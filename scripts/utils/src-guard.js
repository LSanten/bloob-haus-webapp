import fs from "fs-extra";
import path from "path";

const LOCK_FILE = "src/.last-built-site";

/**
 * Wipes src/ when switching between sites so stale content from a previous vault
 * doesn't bleed into the new build. Keeps src/ intact when building the same site.
 *
 * CI: no lock file → always wipes (same as today — fresh checkout every run).
 * Local same-site: lock matches → keeps caches (OG images, favicons, etc.).
 * Local site-switch: lock differs → full wipe → clean slate.
 */
export async function guardSrcForSite(rootDir, siteName) {
  const lockPath = path.join(rootDir, LOCK_FILE);
  const srcDir = path.join(rootDir, "src");

  let lastSite = null;
  if (await fs.pathExists(lockPath)) {
    lastSite = (await fs.readFile(lockPath, "utf-8")).trim();
  }

  if (lastSite !== siteName) {
    const reason = lastSite ? `${lastSite} → ${siteName}` : "no previous lock";
    console.log(`[src-guard] Site changed (${reason}) — wiping src/`);
    await fs.remove(srcDir);
    await fs.ensureDir(srcDir);
  } else {
    console.log(`[src-guard] Same site (${siteName}) — keeping src/ cache`);
  }

  await fs.outputFile(lockPath, siteName);
}
