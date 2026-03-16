import { useMemo } from 'react';

// Vite handles JSON imports at build time.
// The ?url suffix is not needed -- Vite resolves JSON with the alias @data.
// If the file doesn't exist (pre-scrape), Vite will error at build time,
// so we provide an empty fallback via the alias resolution in vite.config.js.
import rawAcronyms from '@data/acronyms.json';

/**
 * Returns the acronym lookup map and a pre-compiled regex for matching.
 * Both are memoized at module level since they never change at runtime.
 */
export function useAcronyms() {
  return useMemo(() => {
    const map = rawAcronyms || {};
    const keys = Object.keys(map);

    if (keys.length === 0) {
      return { map: {}, regex: null };
    }

    // Sort longest-first so longer acronyms match before shorter subsets
    // (e.g. "ADS-B" before "AD")
    const sorted = [...keys].sort((a, b) => b.length - a.length);

    // Escape special regex characters in each acronym key
    const escaped = sorted.map(k =>
      k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    // Build a single alternation regex with word boundaries.
    // Use lookahead/lookbehind to handle acronyms with special chars like /
    const pattern = escaped.join('|');
    const regex = new RegExp(`(?<![A-Za-z0-9])(${pattern})(?![A-Za-z0-9])`, 'g');

    return { map, regex };
  }, []);
}
