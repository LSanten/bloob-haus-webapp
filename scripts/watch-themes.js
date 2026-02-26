/**
 * Watch Themes
 * Watches the themes/ directory for changes and re-runs assemble-src.js.
 * Used during development with `npm run dev` via concurrently.
 *
 * Usage: node scripts/watch-themes.js --site=buffbaby
 */

import { watch } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { resolveSiteName } from "./utils/config-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const THEMES_DIR = path.join(ROOT_DIR, "themes");

const siteName = resolveSiteName();
let debounceTimer = null;

function reassemble() {
  console.log(`[watch] Theme change detected — reassembling src/ for ${siteName}...`);
  try {
    execSync(`node scripts/assemble-src.js --site=${siteName}`, {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    console.log("[watch] Reassembly complete.");
  } catch (e) {
    console.error("[watch] Reassembly failed:", e.message);
  }
}

// Watch themes/ recursively
watch(THEMES_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  // Debounce rapid changes (e.g., editor save + backup)
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    reassemble();
  }, 300);
});

console.log(`[watch] Watching themes/ for changes (site: ${siteName})...`);
