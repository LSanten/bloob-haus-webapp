/**
 * Content Clone Script
 * Clones or pulls the content repository from GitHub.
 */

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content-source");

/**
 * Clones the content repository or pulls if it already exists.
 * @param {Object} options - Configuration options
 * @param {string} options.token - GitHub Personal Access Token
 * @param {string} options.repo - Repository in format "owner/repo"
 * @param {string} [options.branch] - Branch to clone (defaults to repo default)
 * @returns {string} Path to the cloned content directory
 */
export async function cloneContent({ token, repo, branch }) {
  if (!token) {
    throw new Error("[clone] GITHUB_TOKEN is required");
  }
  if (!repo) {
    throw new Error("[clone] CONTENT_REPO is required");
  }

  const repoUrl = `https://${token}@github.com/${repo}.git`;

  console.log(`[clone] Repository: ${repo}`);
  console.log(`[clone] Target directory: ${CONTENT_DIR}`);

  try {
    if (fs.existsSync(CONTENT_DIR)) {
      // Directory exists - check if it's a git repo and pull
      const gitDir = path.join(CONTENT_DIR, ".git");

      if (fs.existsSync(gitDir)) {
        // Check if this is the right repo — if not, remove and re-clone
        try {
          const currentRemote = execSync("git remote get-url origin", {
            cwd: CONTENT_DIR,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
          }).trim();
          // Compare repo names (ignore token in URL)
          const currentRepoMatch = currentRemote.match(/github\.com\/(.+?)\.git$/);
          const currentRepoName = currentRepoMatch ? currentRepoMatch[1] : "";
          if (currentRepoName.toLowerCase() !== repo.toLowerCase()) {
            console.log(`[clone] Different repo detected (${currentRepoName} vs ${repo}), re-cloning...`);
            await fs.remove(CONTENT_DIR);
            await cloneFresh(repoUrl, branch);
            const files = await fs.readdir(CONTENT_DIR);
            console.log(`[clone] Content directory contains ${files.length} items`);
            return CONTENT_DIR;
          }
        } catch {
          // If we can't check the remote, proceed with pull
        }

        // Unshallow if needed — full history is required for git date extraction
        try {
          const isShallow = execSync("git rev-parse --is-shallow-repository", {
            cwd: CONTENT_DIR,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
          }).trim();
          if (isShallow === "true") {
            console.log(
              "[clone] Shallow repo detected, fetching full history...",
            );
            execSync("git fetch --unshallow", {
              cwd: CONTENT_DIR,
              stdio: "pipe",
            });
          }
        } catch {
          // Ignore — not critical if unshallow check fails
        }

        console.log(
          "[clone] Content directory exists, pulling latest changes...",
        );
        execSync("git pull --ff-only", {
          cwd: CONTENT_DIR,
          stdio: "pipe",
        });
        console.log("[clone] Pull complete");
      } else {
        // Directory exists but isn't a git repo - remove and clone fresh
        console.log(
          "[clone] Directory exists but is not a git repo, removing...",
        );
        await fs.remove(CONTENT_DIR);
        await cloneFresh(repoUrl, branch);
      }
    } else {
      // Directory doesn't exist - clone fresh
      await cloneFresh(repoUrl, branch);
    }

    // Verify the clone/pull worked
    if (!fs.existsSync(CONTENT_DIR)) {
      throw new Error("[clone] Content directory does not exist after clone");
    }

    const files = await fs.readdir(CONTENT_DIR);
    console.log(`[clone] Content directory contains ${files.length} items`);

    return CONTENT_DIR;
  } catch (error) {
    // Sanitize error message to not leak token
    const sanitizedMessage = error.message.replace(token, "[REDACTED]");
    throw new Error(`[clone] Failed to clone repository: ${sanitizedMessage}`);
  }
}

/**
 * Performs a full clone of the repository.
 * Full history is needed so git-date-extractor can read per-file last-modified dates.
 * @param {string} repoUrl - Full repository URL with token
 * @param {string} [branch] - Branch to clone (defaults to repo default)
 */
async function cloneFresh(repoUrl, branch) {
  const branchFlag = branch ? ` --branch "${branch}"` : "";
  console.log(`[clone] Cloning repository (full history)...${branch ? ` branch: ${branch}` : ""}`);
  execSync(`git clone${branchFlag} "${repoUrl}" "${CONTENT_DIR}"`, {
    stdio: "pipe",
  });
  console.log("[clone] Clone complete");
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Load environment variables from .env.local
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.CONTENT_REPO;

  cloneContent({ token, repo })
    .then((contentDir) => {
      console.log(`[clone] Success! Content available at: ${contentDir}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
