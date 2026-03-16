/**
 * Fetches and normalizes the acronyms dataset from xransum/pplground.
 *
 * Source format: { "A": [{acronym, definition}, ...], "B": [...], ... }
 * Output format: { "ATC": ["Air Traffic Control"], "ADS-B": ["Automatic Dependent Surveillance-Broadcast"], ... }
 *
 * Multiple definitions per acronym are preserved as an array so the UI
 * can display all of them in the tooltip.
 */

import fetch from 'node-fetch';

const ACRONYMS_URL =
  'https://raw.githubusercontent.com/xransum/pplground/main/data/acronyms.json';

/**
 * Downloads and normalizes the acronyms JSON from the pplground repo.
 * Returns a flat lookup map: { [acronym: string]: string[] }
 */
export async function fetchAcronyms() {
  console.log('  Fetching acronyms.json from xransum/pplground...');
  const res = await fetch(ACRONYMS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch acronyms: ${res.status} ${res.statusText}`);
  }

  const raw = await res.json();
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
