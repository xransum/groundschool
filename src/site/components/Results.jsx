import AcronymText from './AcronymText.jsx';

const LABELS = ['A', 'B', 'C', 'D'];

/**
 * Results screen shown after the quiz finishes.
 */
export default function Results({ quiz, onRestart }) {
  const { deck, answers, score, totalWithAnswers, passed, elapsed } = quiz;

  const pct = totalWithAnswers > 0 ? Math.round((score / totalWithAnswers) * 100) : 0;

  const missed = deck.filter(q => {
    const chosen = answers[q.id] ?? null;
    return q.correct !== null && chosen !== q.correct;
  });

  const skipped = deck.filter(q => q.correct !== null && !(q.id in answers));

  function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
        Test Complete
      </h2>
      <p className="mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Time used: {formatTime(elapsed)}
      </p>

      {/* Score card */}
      <div className="rounded-xl p-6 mb-8 text-center"
        style={{ background: 'var(--color-surface)', border: `2px solid ${passed ? 'var(--color-correct)' : 'var(--color-wrong)'}` }}>
        <div className="text-6xl font-bold mb-2" style={{ color: passed ? 'var(--color-correct)' : 'var(--color-wrong)' }}>
          {pct}%
        </div>
        <div className="text-lg font-semibold mb-1">
          {score} / {totalWithAnswers} correct
        </div>
        <div className="text-sm" style={{ color: passed ? 'var(--color-correct)' : 'var(--color-wrong)' }}>
          {passed ? 'PASS -- above 70% threshold' : 'FAIL -- below 70% threshold'}
        </div>
        {skipped.length > 0 && (
          <div className="text-xs mt-2" style={{ color: 'var(--color-warn)' }}>
            {skipped.length} question{skipped.length !== 1 ? 's' : ''} not answered
          </div>
        )}
      </div>

      {/* Missed questions review */}
      {missed.length > 0 && (
        <section>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--color-warn)' }}>
            Review -- {missed.length} Missed Question{missed.length !== 1 ? 's' : ''}
          </h3>
          <div className="flex flex-col gap-4">
            {missed.map(q => {
              const chosen = answers[q.id] ?? null;
              return (
                <div key={q.id} className="p-4 rounded-lg"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)' }}>
                  <p className="text-sm font-medium mb-3">
                    <AcronymText text={q.question} />
                  </p>
                  <div className="flex flex-col gap-1">
                    {q.answers.map((ans, i) => {
                      const isCorrect = i === q.correct;
                      const isChosen = i === chosen;
                      let color = 'var(--color-text-muted)';
                      if (isCorrect) color = 'var(--color-correct)';
                      else if (isChosen) color = 'var(--color-wrong)';
                      return (
                        <div key={i} className="text-sm flex gap-2" style={{ color }}>
                          <span className="font-semibold w-5 shrink-0">{LABELS[i]}.</span>
                          <span><AcronymText text={ans} /></span>
                          {isCorrect && <span className="ml-auto shrink-0 text-xs font-semibold">CORRECT</span>}
                          {isChosen && !isCorrect && <span className="ml-auto shrink-0 text-xs font-semibold">YOUR ANSWER</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.acs_code && (
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      ACS: {q.acs_code} &nbsp;|&nbsp; {q.subject}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-lg font-semibold text-sm"
          style={{ background: 'var(--color-sky)', color: '#fff' }}
        >
          New Test
        </button>
      </div>
    </div>
  );
}
