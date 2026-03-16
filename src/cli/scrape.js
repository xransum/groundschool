/**
 * scrape command -- one-shot data collection.
 *
 * Downloads the FAA PAR question bank PDF from the Wayback Machine,
 * fetches the external community question bank (github.com/hhaste/faa-knowledge-exam),
 * fetches the acronyms dataset from pplground, optionally supplements
 * with PSI portal questions, and writes the results to src/data/.
 *
 * Run this once. Commit the output. Never need to run it again unless
 * the FAA updates the question bank.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { scrapePdf } from '../scraper/pdf.js';
import { scrapePsi } from '../scraper/psi.js';
import { fetchExternalQuestions } from '../scraper/external.js';
import { fetchAcronyms } from '../scraper/acronyms.js';
import { mergeQuestions, summarize } from '../scraper/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');

function writeJson(filename, data) {
  const filepath = resolve(DATA_DIR, filename);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const kb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`  Wrote ${filepath} (${kb} KB)`);
}

export async function runScrape(opts = {}) {
  const skipPsi = opts.skipPsi || false;

  console.log('\ngroundschool scrape -- one-shot data collection');
  console.log('='.repeat(50));

  // Step 1: PDF question bank (primary source)
  console.log('\n[1/4] FAA PAR question bank (Wayback Machine PDF)');
  let pdfQuestions = [];
  try {
    pdfQuestions = await scrapePdf();
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    console.error('  Could not fetch PDF. Check your internet connection.');
    process.exit(1);
  }

  // Step 2: PSI portal supplement (optional)
  let psiQuestions = [];
  if (!skipPsi) {
    console.log('\n[2/4] PSI sample test portal (supplement)');
    try {
      psiQuestions = await scrapePsi();
    } catch (err) {
      console.warn(`  PSI scrape failed: ${err.message}`);
      console.warn('  Continuing with PDF data only');
    }
  } else {
    console.log('\n[2/4] PSI sample test portal -- skipped (--skip-psi)');
  }

  // Step 3: External community question bank (github.com/hhaste/faa-knowledge-exam)
  console.log('\n[3/4] External community bank (hhaste/faa-knowledge-exam)');
  let externalQuestions = [];
  try {
    externalQuestions = await fetchExternalQuestions();
    console.log(`  Fetched ${externalQuestions.length} questions`);
  } catch (err) {
    console.warn(`  External fetch failed: ${err.message}`);
    console.warn('  Continuing without external bank');
  }

  // Step 4: Acronyms
  console.log('\n[4/4] Acronyms from xransum/pplground');
  let acronyms = {};
  try {
    acronyms = await fetchAcronyms();
  } catch (err) {
    console.warn(`  Acronym fetch failed: ${err.message}`);
    console.warn('  Continuing without acronyms data');
  }

  // Merge and deduplicate questions
  console.log('\nMerging and deduplicating questions...');
  const questions = mergeQuestions([pdfQuestions, psiQuestions, externalQuestions]);

  const stats = summarize(questions);
  console.log('\nResults:');
  console.log(`  Total questions:        ${stats.total}`);
  console.log(`  With correct answer:    ${stats.withCorrectAnswer}`);
  console.log(`  With ACS code:          ${stats.withAcsCode}`);
  console.log(`  Unique acronyms:        ${Object.keys(acronyms).length}`);
  console.log('\n  By subject:');
  for (const [subject, count] of Object.entries(stats.bySubject).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${subject.padEnd(35)} ${count}`);
  }
  console.log('\n  By source:');
  for (const [source, count] of Object.entries(stats.bySources)) {
    console.log(`    ${source.padEnd(10)} ${count}`);
  }

  // Write output files
  console.log('\nWriting data files...');
  writeJson('questions.json', questions);
  writeJson('acronyms.json', acronyms);

  console.log('\nDone. Commit src/data/questions.json and src/data/acronyms.json to your repo.');
  console.log('You do not need to run scrape again unless the FAA updates the question bank.\n');
}
