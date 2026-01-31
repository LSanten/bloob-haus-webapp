/**
 * Git Date Extractor
 * Extracts last modified date from git history for files.
 */

import { execSync } from 'child_process';
import path from 'path';

/**
 * Gets the last modified date of a file from git history.
 * Falls back to file system date if git command fails.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} repoPath - Path to the git repository
 * @returns {string|null} ISO date string or null if unavailable
 */
export function getLastModifiedDate(filePath, repoPath) {
  try {
    // Get relative path from repo root
    const relativePath = path.relative(repoPath, filePath);

    // Get last commit date for this file
    const gitDate = execSync(
      `git log -1 --format=%aI -- "${relativePath}"`,
      {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
      }
    ).trim();

    if (gitDate) {
      return gitDate;
    }
  } catch (error) {
    // Git command failed - file might not be committed yet
  }

  // Fallback: return null, let Hugo use file system date
  return null;
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testFile = process.argv[2];
  const repoPath = process.argv[3] || process.cwd();

  if (!testFile) {
    console.log('Usage: node git-date-extractor.js <file-path> [repo-path]');
    process.exit(1);
  }

  const date = getLastModifiedDate(testFile, repoPath);
  console.log('Last modified date:', date || 'Not available');
}
