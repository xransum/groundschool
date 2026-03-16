import { useState, useEffect } from 'react';
import { useQuiz } from '../hooks/useQuiz.js';
import AcronymText from './AcronymText.jsx';
import Results from './Results.jsx';

// Vite resolves this at build time via the @data alias
import allQuestionsRaw from '@data/questions.json';
const allQuestions = allQuestionsRaw || [];

const ALL_SUBJECTS = [...new Set(allQuestions.map(q => q.subject))].sort();

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Setup screen -- choose subjects, question count, time limit.
 */
function QuizSetup({ onStart }) {
  const [selectedSubjects, setSelectedSubjects] = useState(new Set(ALL_SUBJECTS));
  const [questionCount, setQuestionCount] = useState(60);
  const [timeLimitMin, setTimeLimitMin] = useState(120);

  const available = allQuestions.filter(
    q => selectedSubjects.has(q.subject) && q.correct !== null
  ).length;

  function toggleSubject(subj) {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subj)) { next.delete(subj); } else { next.add(subj); }
      return next;
    });
  }

  function selectAll() { setSelectedSubjects(new Set(ALL_SUBJECTS)); }
  function selectNone() { setSelectedSubjects(new Set()); }

  function handleStart() {
    const pool = allQuestions.filter(
      q => selectedSubjects.has(q.subject) && q.correct !== null
    );
    const count = Math.min(questionCount, pool.length);
    // Shuffle and slice to requested count
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    onStart(shuffled, timeLimitMin * 60);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
        Written Test Practice
      </h2>
      <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Select subjects, question count, and time limit to configure your practice test.
      </p>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Subject Areas</h3>
          <div className="flex gap-3 text-sm">
            <button onClick={selectAll} style={{ color: 'var(--color-accent)' }}>All</button>
            <button onClick={selectNone} style={{ color: 'var(--color-text-muted)' }}>None</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_SUBJECTS.map(subj => {
            const count = allQuestions.filter(q => q.subject === subj && q.correct !== null).length;
            return (
              <label key={subj} className="flex items-center gap-2 cursor-pointer p-2 rounded"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)' }}>
                <input
                  type="checkbox"
                  checked={selectedSubjects.has(subj)}
                  onChange={() => toggleSubject(subj)}
                  className="accent-sky-400"
                />
                <span className="flex-1 text-sm">{subj}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{count}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">
            Questions <span style={{ color: 'var(--color-text-muted)' }}>({available} available)</span>
          </label>
          <input
            type="number"
            min={1}
            max={available}
            value={questionCount}
            onChange={e => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)', color: 'var(--color-text)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Time Limit (minutes)</label>
          <input
            type="number"
            min={1}
            max={240}
            value={timeLimitMin}
            onChange={e => setTimeLimitMin(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)', color: 'var(--color-text)' }}
          />
        </div>
      </section>

      <button
        onClick={handleStart}
        disabled={available === 0 || selectedSubjects.size === 0}
        className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity"
        style={{ background: 'var(--color-sky)', color: '#fff', opacity: available === 0 ? 0.4 : 1 }}
      >
        Start Test ({Math.min(questionCount, available)} questions, {timeLimitMin} min)
      </button>

      {allQuestions.length === 0 && (
        <p className="mt-4 text-sm text-center" style={{ color: 'var(--color-warn)' }}>
          No questions found. Run <code>groundschool scrape</code> to populate question data.
        </p>
      )}
    </div>
  );
}

/**
 * Active quiz screen.
 */
function QuizQuestion({ quiz, onFinish }) {
  const { current, index, total, timeRemaining, answers, revealed, answer, next, prev, finish } = quiz;

  if (!current) return null;

  const chosen = answers[current.id] ?? null;
  const isRevealed = revealed[current.id];
  const LABELS = ['A', 'B', 'C', 'D'];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <span>Question {index + 1} of {total}</span>
        <span
          className="font-mono font-semibold"
          style={{ color: timeRemaining < 300 ? 'var(--color-wrong)' : 'var(--color-accent)' }}
        >
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded mb-6" style={{ background: 'var(--color-surface-2)' }}>
        <div
          className="h-1 rounded transition-all"
          style={{ width: `${((index + 1) / total) * 100}%`, background: 'var(--color-sky)' }}
        />
      </div>

      {/* Question */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--color-surface)' }}>
        {current.figure && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-warn)' }}>
            Refer to {current.figure}
          </p>
        )}
        <p className="text-base leading-relaxed">
          <AcronymText text={current.question} />
        </p>
        {current.acs_code && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            ACS: {current.acs_code}
          </p>
        )}
      </div>

      {/* Answers */}
      <div className="flex flex-col gap-3 mb-6">
        {current.answers.map((ans, i) => {
          let cls = 'answer-btn';
          if (isRevealed) {
            if (i === current.correct) cls += ' revealed-correct';
            else if (i === chosen && i !== current.correct) cls += ' wrong';
          } else if (chosen === i) {
            cls += ' correct'; // pending -- just highlight selected
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={isRevealed}
              onClick={() => answer(current.id, i)}
            >
              <span className="font-semibold mr-2" style={{ color: 'var(--color-text-muted)' }}>
                {LABELS[i]}.
              </span>
              <AcronymText text={ans} />
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2 rounded text-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-2)', opacity: index === 0 ? 0.4 : 1 }}
        >
          Previous
        </button>
        {index < total - 1 ? (
          <button
            onClick={next}
            className="flex-1 py-2 rounded text-sm font-semibold"
            style={{ background: 'var(--color-sky)', color: '#fff' }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex-1 py-2 rounded text-sm font-semibold"
            style={{ background: 'var(--color-correct)', color: '#fff' }}
          >
            Finish Test
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Top-level QuizMode component -- manages setup -> quiz -> results flow.
 */
export default function QuizMode() {
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [timeLimit, setTimeLimit] = useState(7200);

  const quiz = useQuiz(quizQuestions || [], { timeLimitSeconds: timeLimit });

  function handleStart(questions, timeLimitSec) {
    setQuizQuestions(questions);
    setTimeLimit(timeLimitSec);
  }

  // Auto-start when questions are set
  useEffect(() => {
    if (quizQuestions && !quiz.started) quiz.start();
  }, [quizQuestions]);

  if (!quizQuestions || !quiz.started) {
    return <QuizSetup onStart={handleStart} />;
  }

  if (quiz.finished) {
    return <Results quiz={quiz} onRestart={() => { setQuizQuestions(null); quiz.restart(); }} />;
  }

  return <QuizQuestion quiz={quiz} />;
}
