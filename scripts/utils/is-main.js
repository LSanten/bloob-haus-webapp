import { pathToFileURL } from "url";

/**
 * True when the module identified by `importMetaUrl` is the process entry point
 * (run directly, e.g. `node scripts/foo.js`), false when it was imported.
 *
 * Cross-platform: it builds the entry-point URL with `pathToFileURL`, so a
 * Windows path (`C:\…`) matches `import.meta.url` (`file:///C:/…`). The old
 * idiom `import.meta.url === `file://${process.argv[1]}`` silently failed on
 * Windows (backslashes / drive letters never matched), disabling every script's
 * direct-run block there — including the theme-watcher's reassembly, so dev
 * hot-reload did nothing. See TECH-DEBT #25.
 *
 * Also guards the no-entry case (`node -e …`, where `process.argv[1]` is
 * undefined) — `pathToFileURL(undefined)` throws, so callers must not.
 *
 * @param {string} importMetaUrl - pass `import.meta.url` from the calling module
 * @returns {boolean}
 */
export function isMainModule(importMetaUrl) {
  const entry = process.argv[1];
  return Boolean(entry) && importMetaUrl === pathToFileURL(entry).href;
}
