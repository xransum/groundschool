import { useMemo } from 'react';
import { useAcronyms } from '../hooks/useAcronyms.js';
import Tooltip from './Tooltip.jsx';

/**
 * Renders a string of text with any recognized aviation acronyms highlighted.
 * Highlighted acronyms show a tooltip with their definition(s) on hover/tap.
 */
export default function AcronymText({ text }) {
  const { map, regex } = useAcronyms();

  const parts = useMemo(() => {
    if (!text || !regex) return [text];

    const result = [];
    let last = 0;
    let key = 0;

    // Reset regex state
    regex.lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch] = match;
      const start = match.index;

      // Text before this match
      if (start > last) {
        result.push(text.slice(last, start));
      }

      // The matched acronym -- find its definitions
      // Try exact match first, then case-insensitive
      const defs = map[fullMatch] || map[fullMatch.toUpperCase()] || [];

      if (defs.length > 0) {
        const tooltipContent = (
          <>
            <strong style={{ display: 'block', marginBottom: defs.length > 1 ? 4 : 0 }}>
              {fullMatch}
            </strong>
            {defs.map((d, i) => (
              <span key={i} style={{ display: 'block', opacity: 0.9 }}>
                {defs.length > 1 && <span style={{ opacity: 0.5 }}>{i + 1}. </span>}
                {d}
              </span>
            ))}
          </>
        );
        result.push(
          <Tooltip key={key++} content={tooltipContent}>
            {fullMatch}
          </Tooltip>
        );
      } else {
        result.push(fullMatch);
      }

      last = start + fullMatch.length;
    }

    // Remaining text after last match
    if (last < text.length) {
      result.push(text.slice(last));
    }

    return result;
  }, [text, map, regex]);

  return <span>{parts}</span>;
}
