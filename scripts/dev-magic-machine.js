/**
 * Magic Machine Dev Server
 *
 * Lightweight static server for developing and testing GUI magic machines.
 * No full site build, no content repo, no Eleventy needed.
 *
 * Steps:
 *   1. Bundle visualizer assets once (for /assets/js/visualizers/*.engine.js etc.)
 *   2. Serve lib/magic-machines/<name>/app/ at http://localhost:8090/
 *   3. Serve bundled assets at /assets/
 *
 * Usage:
 *   node scripts/dev-magic-machine.js <machine-name>
 *   npm run dev:magic-machine ken-burns-zoom-builder
 *
 * Options:
 *   --port=8090        Override default port
 *   --skip-bundle      Skip the visualizer bundle step (if assets are already current)
 *
 * Testing:
 *   node scripts/test-ken-burns-export.js http://localhost:8090
 */

import http from "http";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { safeDecode } from "./utils/safe-decode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── CLI args ─────────────────────────────────────────────────────────────────
const machineName = process.argv.slice(2).find((a) => !a.startsWith("--"));
const port = parseInt(
  process.argv.find((a) => a.startsWith("--port="))?.slice(7) ?? "8090",
  10
);
const skipBundle = process.argv.includes("--skip-bundle");

if (!machineName) {
  console.error("Usage: node scripts/dev-magic-machine.js <machine-name>");
  console.error("       node scripts/dev-magic-machine.js ken-burns-zoom-builder");
  const machines = fs
    .readdirSync(path.join(ROOT, "lib/magic-machines"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, "lib/magic-machines", d.name, "app")))
    .map((d) => `       ${d.name}`);
  if (machines.length) console.error("\nAvailable machines:\n" + machines.join("\n"));
  process.exit(1);
}

const appDir = path.join(ROOT, "lib/magic-machines", machineName, "app");
if (!fs.existsSync(appDir)) {
  console.error(`[error] No app/ directory at: ${appDir}`);
  process.exit(1);
}

// Bundle target: src-magic-machine-dev/ (already matched by src-*/ gitignore pattern)
const bundleDir = path.join(ROOT, "src-magic-machine-dev");

// ── Bundle visualizer assets ─────────────────────────────────────────────────
if (skipBundle && fs.existsSync(path.join(bundleDir, "assets"))) {
  console.log("[magic-machine-dev] --skip-bundle: reusing existing assets");
} else {
  console.log("[magic-machine-dev] Bundling visualizer assets…");
  execSync("node scripts/bundle-visualizers.js", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, SRC_DIR: bundleDir },
  });
}

// ── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript",
  ".mjs":  "text/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt":  "text/plain",
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`404 Not Found\n${filePath}`);
    console.log(`  [404] ${filePath}`);
  }
}

// ── Request handler ──────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const urlPath = safeDecode(req.url.split("?")[0]);

  // /assets/* → bundled visualizer output
  if (urlPath.startsWith("/assets/")) {
    return serveFile(path.join(bundleDir, urlPath), res);
  }

  // Everything else → magic machine app/
  let filePath = path.join(appDir, urlPath === "/" ? "index.html" : urlPath);

  // Directory → index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  serveFile(filePath, res);
});

server.listen(port, () => {
  console.log(`\n  Magic machine dev server\n`);
  console.log(`  http://localhost:${port}/`);
  console.log(`\n  Machine : ${machineName}`);
  console.log(`  App dir : ${appDir}`);
  console.log(`  Assets  : src-magic-machine-dev/assets/`);
  console.log(`\n  Edit files in app/ and refresh the browser.`);
  console.log(`  Ctrl+C to stop.\n`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[error] Port ${port} is already in use. Use --port=<n> to pick another.`);
  } else {
    console.error("[error]", err.message);
  }
  process.exit(1);
});
