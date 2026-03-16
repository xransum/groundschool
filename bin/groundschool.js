#!/usr/bin/env node
/**
 * groundschool CLI entry point
 */

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf8')
);

program
  .name('groundschool')
  .description('FAA Private Pilot License study tool -- written test and oral exam prep')
  .version(pkg.version);

program
  .command('scrape')
  .description(
    'One-shot data collection: downloads the FAA PAR question bank PDF from the ' +
    'Wayback Machine, fetches acronyms from pplground, and optionally scrapes the ' +
    'PSI sample test portal. Run once, commit the output.'
  )
  .option('--skip-psi', 'Skip the PSI portal scrape (faster, PDF only)')
  .action(async (opts) => {
    const { runScrape } = await import('../src/cli/scrape.js');
    await runScrape({ skipPsi: opts.skipPsi });
  });

program
  .command('build')
  .description(
    'Builds the static site into dist/ using Vite. ' +
    'Requires src/data/questions.json to exist (run scrape first).'
  )
  .option(
    '--base <path>',
    'Base URL path for GitHub Pages (default: /groundschool/)',
    '/groundschool/'
  )
  .action(async (opts) => {
    const { runBuild } = await import('../src/cli/build.js');
    runBuild({ base: opts.base });
  });

program.parse();
