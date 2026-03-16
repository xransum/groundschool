/**
 * Fetches and normalizes the external FAA question bank from
 * github.com/hhaste/faa-knowledge-exam.
 *
 * The source schema is:
 *   { question: string, choices: string[], correct: number }
 *
 * We normalize to the groundschool schema:
 *   { id, question, answers, correct, subject, acs_code, plt_code, figure, source }
 *
 * Questions were originally sourced from Sporty's practice tests, which draw
 * from the FAA knowledge test question bank (US government work, public domain).
 */

const EXTERNAL_URL =
  'https://raw.githubusercontent.com/hhaste/faa-knowledge-exam/master/questions.json';

/**
 * Fetches the external question bank and returns it in groundschool schema.
 * IDs are assigned as EXT-1001, EXT-1002, ... to avoid colliding with PAR-XXXX
 * numeric sort order.
 */
export async function fetchExternalQuestions() {
  const res = await fetch(EXTERNAL_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch external questions: HTTP ${res.status}`);
  }

  const raw = await res.json();

  if (!Array.isArray(raw)) {
    throw new Error('External questions response is not an array');
  }

  return raw.map((q, i) => ({
    id: `EXT-${String(1001 + i).padStart(4, '0')}`,
    question: q.question.trim(),
    answers: q.choices.map(c => c.trim()),
    correct: typeof q.correct === 'number' ? q.correct : null,
    subject: 'General',
    acs_code: null,
    plt_code: null,
    figure: null,
    source: 'external',
  }));
}
