import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Shuffles an array in-place using Fisher-Yates and returns it.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Quiz state machine hook.
 *
 * @param {object[]} questions - Array of question objects from questions.json
 * @param {object}   opts
 * @param {number}   opts.timeLimitSeconds - Total time for the quiz (default: 7200 = 2 hours)
 * @param {boolean}  opts.shuffle          - Shuffle question order (default: true)
 */
export function useQuiz(questions, opts = {}) {
  const { timeLimitSeconds = 7200, shuffle: doShuffle = true } = opts;

  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});   // { [questionId]: choiceIndex }
  const [revealed, setRevealed] = useState({}); // { [questionId]: true } -- show correct answer
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Build deck when questions change
  useEffect(() => {
    const d = doShuffle ? shuffle(questions) : [...questions];
    setDeck(d);
    setIndex(0);
    setAnswers({});
    setRevealed({});
    setStarted(false);
    setFinished(false);
    setElapsed(0);
  }, [questions, doShuffle]);

  // Timer
  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= timeLimitSeconds) {
          clearInterval(timerRef.current);
          setFinished(true);
          return timeLimitSeconds;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, finished, timeLimitSeconds]);

  const current = deck[index] || null;
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsed);

  const start = useCallback(() => setStarted(true), []);

  const answer = useCallback((questionId, choiceIndex) => {
    if (!started || finished) return;
    setAnswers(prev => ({ ...prev, [questionId]: choiceIndex }));
    setRevealed(prev => ({ ...prev, [questionId]: true }));
  }, [started, finished]);

  const next = useCallback(() => {
    if (index < deck.length - 1) {
      setIndex(i => i + 1);
    } else {
      setFinished(true);
      clearInterval(timerRef.current);
    }
  }, [index, deck.length]);

  const prev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1);
  }, [index]);

  const goTo = useCallback((i) => {
    if (i >= 0 && i < deck.length) setIndex(i);
  }, [deck.length]);

  const finish = useCallback(() => {
    setFinished(true);
    clearInterval(timerRef.current);
  }, []);

  const restart = useCallback(() => {
    const d = doShuffle ? shuffle(questions) : [...questions];
    setDeck(d);
    setIndex(0);
    setAnswers({});
    setRevealed({});
    setStarted(false);
    setFinished(false);
    setElapsed(0);
    clearInterval(timerRef.current);
  }, [questions, doShuffle]);

  // Scoring
  const score = Object.entries(answers).reduce((acc, [id, choice]) => {
    const q = deck.find(q => q.id === id);
    if (q && q.correct !== null && choice === q.correct) acc++;
    return acc;
  }, 0);

  const answeredCount = Object.keys(answers).length;
  const totalWithAnswers = deck.filter(q => q.correct !== null).length;
  const passed = totalWithAnswers > 0 && score / totalWithAnswers >= 0.7;

  return {
    deck,
    index,
    current,
    answers,
    revealed,
    started,
    finished,
    elapsed,
    timeRemaining,
    score,
    answeredCount,
    total: deck.length,
    totalWithAnswers,
    passed,
    start,
    answer,
    next,
    prev,
    goTo,
    finish,
    restart,
  };
}
