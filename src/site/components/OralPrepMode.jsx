import { useState, useMemo } from 'react';
import AcronymText from './AcronymText.jsx';

import allCardsRaw from '@data/oral-exam.json';
const allCards = allCardsRaw || [];

const ALL_TOPICS = [...new Set(allCards.map(c => c.topic))].sort();

/**
 * Oral exam prep -- flashcard-style study and quiz mode.
 */
export default function OralPrepMode() {
  const [selectedTopics, setSelectedTopics] = useState(new Set(ALL_TOPICS));
  const [mode, setMode] = useState('browse');  // 'browse' | 'quiz'
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(new Set());    // card ids marked as known
  const [quizOnly, setQuizOnly] = useState(false);  // show only unknown cards

  const deck = useMemo(() => {
    let cards = allCards.filter(c => selectedTopics.has(c.topic));
    if (quizOnly) cards = cards.filter(c => !known.has(c.id));
    return cards;
  }, [selectedTopics, quizOnly, known]);

  const current = deck[index] || null;

  function toggleTopic(t) {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(t)) { next.delete(t); } else { next.add(t); }
      return next;
    });
    setIndex(0);
    setRevealed(false);
  }

  function next() {
    setIndex(i => Math.min(i + 1, deck.length - 1));
    setRevealed(false);
  }

  function prev() {
    setIndex(i => Math.max(i - 1, 0));
    setRevealed(false);
  }

  function markKnown(id) {
    setKnown(prev => { const s = new Set(prev); s.add(id); return s; });
    next();
  }

  function markUnknown(id) {
    setKnown(prev => { const s = new Set(prev); s.delete(id); return s; });
    next();
  }

  function reset() {
    setKnown(new Set());
    setIndex(0);
    setRevealed(false);
  }

  if (allCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
        <p>No oral exam cards found.</p>
        <p className="text-sm mt-2">The oral exam data is bundled with the package -- it should always be present.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
        Oral Exam Prep
      </h2>
      <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Flashcard-style review of oral exam topics based on the FAA Airman Certification Standards.
      </p>

      {/* Topic filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_TOPICS.map(t => (
          <button
            key={t}
            onClick={() => toggleTopic(t)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: selectedTopics.has(t) ? 'var(--color-sky)' : 'var(--color-surface)',
              border: `1px solid ${selectedTopics.has(t) ? 'var(--color-sky)' : 'var(--color-surface-2)'}`,
              color: selectedTopics.has(t) ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Progress / options bar */}
      <div className="flex items-center justify-between mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <span>{deck.length === 0 ? 'No cards' : `${index + 1} of ${deck.length}`}</span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={quizOnly}
              onChange={e => { setQuizOnly(e.target.checked); setIndex(0); setRevealed(false); }}
              className="accent-sky-400"
            />
            <span>Unknown only ({deck.length - known.size < 0 ? 0 : deck.length - known.size})</span>
          </label>
          {known.size > 0 && (
            <button onClick={reset} style={{ color: 'var(--color-text-muted)' }} className="text-xs underline">
              Reset ({known.size} known)
            </button>
          )}
        </div>
      </div>

      {deck.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          {quizOnly ? 'All cards marked as known! Reset to start over.' : 'No topics selected.'}
        </div>
      ) : current && (
        <div
          className="rounded-xl p-6 mb-4 cursor-pointer select-none"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)', minHeight: 220 }}
          onClick={() => setRevealed(r => !r)}
        >
          {/* Topic + ACS badge */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--color-sky-dark)', color: '#fff' }}>
              {current.topic}
            </span>
            {current.acs_code && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                {current.acs_code}
              </span>
            )}
          </div>

          <p className="font-medium text-base mb-4">
            <AcronymText text={current.question} />
          </p>

          {!revealed ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
              Tap to reveal answer
            </p>
          ) : (
            <>
              <div className="border-t pt-4" style={{ borderColor: 'var(--color-surface-2)' }}>
                <p className="text-sm leading-relaxed">
                  <AcronymText text={current.answer} />
                </p>
                {current.references && current.references.length > 0 && (
                  <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                    Ref: {current.references.join(' | ')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation + Know it / Still learning */}
      {current && (
        <div className="flex gap-2">
          <button
            onClick={prev}
            disabled={index === 0}
            className="px-4 py-2 rounded text-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)', opacity: index === 0 ? 0.4 : 1 }}
          >
            Prev
          </button>
          {revealed && (
            <>
              <button
                onClick={() => markUnknown(current.id)}
                className="flex-1 py-2 rounded text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--color-wrong)', color: 'var(--color-wrong)' }}
              >
                Still learning
              </button>
              <button
                onClick={() => markKnown(current.id)}
                className="flex-1 py-2 rounded text-sm font-semibold"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid var(--color-correct)', color: 'var(--color-correct)' }}
              >
                Know it
              </button>
            </>
          )}
          {!revealed && (
            <button
              onClick={next}
              disabled={index === deck.length - 1}
              className="flex-1 py-2 rounded text-sm font-semibold"
              style={{ background: 'var(--color-sky)', color: '#fff', opacity: index === deck.length - 1 ? 0.4 : 1 }}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
