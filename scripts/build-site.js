/**
 * Build Site Script
 * Orchestrates the full build: clone → preprocess → hugo build
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { cloneContent } from './clone-content.js';
import { preprocessContent } from './preprocess-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Main build function.
 */
async function buildSite() {
  console.log('\n========================================');
  console.log('  BLOOB HAUS BUILD');
  console.log('========================================\n');

  const startTime = Date.now();

  try {
    // Load environment variables
    loadEnv();

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.CONTENT_REPO;

    if (!token || !repo) {
      throw new Error('Missing required environment variables: GITHUB_TOKEN and CONTENT_REPO');
    }

    // Step 1: Clone content
    console.log('--- Step 1: Cloning content repository ---\n');
    const contentDir = await cloneContent({ token, repo });

    // Step 2: Preprocess content
    console.log('\n');
    await preprocessContent({
      contentDir,
      outputDir: path.join(ROOT_DIR, 'hugo', 'content'),
      staticDir: path.join(ROOT_DIR, 'hugo', 'static'),
    });

    // Step 3: Run Hugo build
    console.log('\n--- Step 3: Running Hugo build ---');
    const hugoDir = path.join(ROOT_DIR, 'hugo');
    const publicDir = path.join(ROOT_DIR, 'public');

    // Clean public directory
    await fs.remove(publicDir);
    console.log('[hugo] Cleaned public directory');

    // Run Hugo
    console.log('[hugo] Building site...');
    execSync('npx hugo', {
      cwd: hugoDir,
      stdio: 'inherit',
    });

    // Verify output
    if (!await fs.pathExists(publicDir)) {
      throw new Error('Hugo build failed - public directory not created');
    }

    const files = await fs.readdir(publicDir);
    console.log(`[hugo] Build complete - ${files.length} files in public/`);

    // Build summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log('  BUILD COMPLETE');
    console.log('========================================');
    console.log(`  Duration: ${duration}s`);
    console.log(`  Output: ${publicDir}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ BUILD FAILED:', error.message);
    process.exit(1);
  }
}

/**
 * Loads environment variables from .env.local
 */
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env.local');

  if (!fs.existsSync(envPath)) {
    console.warn('Warning: .env.local not found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildSite();
}

export { buildSite };
