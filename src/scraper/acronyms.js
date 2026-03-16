/**
 * Loads and normalizes the acronyms dataset bundled with groundschool.
 *
 * Source data is stored in acronyms-source.json (copied from the now-archived
 * xransum/pplground repo). To update the acronyms in the future, replace that
 * file with an updated copy and re-run `groundschool scrape`.
 *
 * Source format: { "A": [{acronym, definition}, ...], "B": [...], ... }
 * Output format: { "ATC": ["Air Traffic Control"], "ADS-B": ["..."], ... }
 *
 * Multiple definitions per acronym are preserved as an array so the UI
 * can display all of them in the tooltip.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACRONYMS_SOURCE = resolve(__dirname, 'acronyms-source.json');

/**
 * Reads and normalizes the bundled acronyms JSON.
 * Returns a flat lookup map: { [acronym: string]: string[] }
 */
export async function fetchAcronyms() {
  console.log('  Loading bundled acronyms-source.json...');
  const raw = JSON.parse(readFileSync(ACRONYMS_SOURCE, 'utf8'));
  const normalized = normalizeAcronyms(raw);
  const count = Object.keys(normalized).length;
  console.log(`  Normalized ${count} unique acronyms`);
  return normalized;
}

/**
 * Flattens the letter-bucketed source format into a single lookup map.
 * - Skips the known corrupt TFDS/TFM entry
 * - Groups multiple definitions under the same acronym key
 * - Trims whitespace and filters blank entries
 */
function normalizeAcronyms(raw) {
  const map = {};

  for (const letter of Object.keys(raw)) {
    const entries = raw[letter];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const acronym = (entry.acronym || '').trim();
      const definition = (entry.definition || '').trim();

      // Skip blank or malformed entries
      if (!acronym || !definition) continue;

      // Skip the known corrupt entry where the acronym field contains
      // embedded text that belongs in the definition (TFDS/TFM data error)
      if (acronym.includes('\n') || acronym.includes('\t')) continue;
      if (acronym.length > 30) continue;  // sanity check

      if (!map[acronym]) {
        map[acronym] = [];
      }

      // Avoid duplicate definitions for the same acronym
      if (!map[acronym].includes(definition)) {
        map[acronym].push(definition);
      }
    }
  }

  return map;
}
