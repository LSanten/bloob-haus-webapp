import path from "path";
import { ROOT_DIR } from "./config-loader.js";

/**
 * Returns the per-site src directory path based on the subdomain in config.site.url.
 *   buffbaby.bloob.haus  → {root}/src-buffbaby
 *   marbles.bloob.haus   → {root}/src-marbles
 *
 * Falls back to {root}/src if the URL is missing or unparseable — keeps CI and
 * standalone script invocations working without any env var setup.
 */
export function getSrcDir(siteUrl) {
  try {
    const subdomain = new URL(siteUrl).hostname.split(".")[0];
    if (!subdomain) throw new Error("empty subdomain");
    return path.join(ROOT_DIR, `src-${subdomain}`);
  } catch {
    return path.join(ROOT_DIR, "src");
  }
}
