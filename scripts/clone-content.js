/**
 * Content Clone Script
 * Clones or pulls the content repository from GitHub.
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content-source');

/**
 * Clones the content repository or pulls if it already exists.
 * @param {Object} options - Configuration options
 * @param {string} options.token - GitHub Personal Access Token
 * @param {string} options.repo - Repository in format "owner/repo"
 * @returns {string} Path to the cloned content directory
 */
export async function cloneContent({ token, repo }) {
  if (!token) {
    throw new Error('[clone] GITHUB_TOKEN is required');
  }
  if (!repo) {
    throw new Error('[clone] CONTENT_REPO is required');
  }

  const repoUrl = `https://${token}@github.com/${repo}.git`;

  console.log(`[clone] Repository: ${repo}`);
  console.log(`[clone] Target directory: ${CONTENT_DIR}`);

  try {
    if (fs.existsSync(CONTENT_DIR)) {
      // Directory exists - check if it's a git repo and pull
      const gitDir = path.join(CONTENT_DIR, '.git');

      if (fs.existsSync(gitDir)) {
        console.log('[clone] Content directory exists, pulling latest changes...');
        execSync('git pull --ff-only', {
          cwd: CONTENT_DIR,
          stdio: 'pipe',
        });
        console.log('[clone] Pull complete');
      } else {
        // Directory exists but isn't a git repo - remove and clone fresh
        console.log('[clone] Directory exists but is not a git repo, removing...');
        await fs.remove(CONTENT_DIR);
        await cloneFresh(repoUrl);
      }
    } else {
      // Directory doesn't exist - clone fresh
      await cloneFresh(repoUrl);
    }

    // Verify the clone/pull worked
    if (!fs.existsSync(CONTENT_DIR)) {
      throw new Error('[clone] Content directory does not exist after clone');
    }

    const files = await fs.readdir(CONTENT_DIR);
    console.log(`[clone] Content directory contains ${files.length} items`);

    return CONTENT_DIR;
  } catch (error) {
    // Sanitize error message to not leak token
    const sanitizedMessage = error.message.replace(token, '[REDACTED]');
    throw new Error(`[clone] Failed to clone repository: ${sanitizedMessage}`);
  }
}

/**
 * Performs a fresh shallow clone of the repository.
 * @param {string} repoUrl - Full repository URL with token
 */
async function cloneFresh(repoUrl) {
  console.log('[clone] Cloning repository (shallow clone)...');
  execSync(`git clone --depth 1 "${repoUrl}" "${CONTENT_DIR}"`, {
    stdio: 'pipe',
  });
  console.log('[clone] Clone complete');
}

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Load environment variables from .env.local
  const envPath = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
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
