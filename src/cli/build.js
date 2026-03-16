/**
 * build command -- generates the static site into dist/.
 *
 * Wraps `vite build` with the correct config path and base URL.
 * The VITE_BASE_PATH env var controls the GitHub Pages subpath
 * (defaults to /groundschool/).
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const DATA_DIR = resolve(__dirname, '../data');

export function runBuild(opts = {}) {
  // Verify data files exist before attempting build
  const questionsPath = resolve(DATA_DIR, 'questions.json');
  const acronymsPath = resolve(DATA_DIR, 'acronyms.json');

  if (!existsSync(questionsPath)) {
    console.error('\nERROR: src/data/questions.json not found.');
    console.error('Run "groundschool scrape" first to generate the data files.\n');
    process.exit(1);
  }

  if (!existsSync(acronymsPath)) {
    console.warn('\nWARNING: src/data/acronyms.json not found.');
    console.warn('Acronym highlighting will be disabled in the built site.');
    console.warn('Run "groundschool scrape" to fetch acronym data.\n');
  }

  const basePath = opts.base || process.env.VITE_BASE_PATH || '/groundschool/';

  console.log('\ngroundschool build');
  console.log('='.repeat(50));
  console.log(`  Base path: ${basePath}`);
  console.log(`  Output:    ${resolve(ROOT, 'dist')}\n`);

  try {
    execSync(`npx vite build --base "${basePath}"`, {
      cwd: resolve(__dirname, '../site'),
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_BASE_PATH: basePath,
      },
    });
    console.log('\nBuild complete. Push the dist/ folder to your gh-pages branch.\n');
  } catch (err) {
    console.error('\nBuild failed.');
    process.exit(1);
  }
}
