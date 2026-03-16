/**
 * Merges and deduplicates questions from multiple sources (PDF, PSI portal,
 * external community bank) into a single canonical questions.json dataset.
 *
 * Dedup strategy:
 *  - Primary key is question ID (PAR-XXXX) when available
 *  - For questions without IDs (PSI/EXT source), normalized question text is used
 *  - When a PDF question with correct: null matches an external question by
 *    normalized text, the correct answer is back-filled from the external record
 *  - Otherwise earlier sources win on conflict (PDF > PSI > external)
 */

import { createHash } from 'crypto';

/**
 * Normalizes a question text string for comparison purposes.
 * Lowercases, strips punctuation, collapses whitespace.
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a short content hash for a question (used as fallback ID).
 */
function contentHash(question) {
  return createHash('sha1')
    .update(normalizeText(question))
    .digest('hex')
    .slice(0, 8);
}

/**
 * Assigns a generated ID to questions that don't have one (PSI source).
 */
function assignId(q, index) {
  if (q.id) return q.id;
  return `PSI-${String(index + 1).padStart(4, '0')}`;
}

/**
 * Returns a sort key for an ID so that PAR < PSI < EXT, with numeric order
 * within each prefix.
 */
function sortKey(id) {
  if (id.startsWith('PAR-')) return [0, parseInt(id.slice(4), 10)];
  if (id.startsWith('PSI-')) return [1, parseInt(id.slice(4), 10)];
  if (id.startsWith('EXT-')) return [2, parseInt(id.slice(4), 10)];
  return [3, 0];
}

/**
 * Merges questions from multiple source arrays, deduplicating by question ID
 * and by normalized question text.
 *
 * Sources are processed in priority order -- earlier sources win on conflict.
 * Expected order: [pdfQuestions, psiQuestions, externalQuestions]
 *
 * Special case: when an earlier-source question has correct: null and a
 * later-source question matches by normalized text with a non-null correct
 * value, the correct answer is back-filled into the earlier record.
 */
export function mergeQuestions(sources) {
  const byId = new Map();       // id -> index in result
  const byText = new Map();     // normalizedText -> index in result
  const result = [];
  let psiIndex = 0;

  for (const sourceList of sources) {
    for (const q of sourceList) {
      const id = q.id || assignId(q, psiIndex++);
      const textKey = normalizeText(q.question);

      // If we already have this question by text, attempt to back-fill correct
      if (byText.has(textKey)) {
        const existingIdx = byText.get(textKey);
        if (result[existingIdx].correct === null && q.correct !== null) {
          result[existingIdx].correct = q.correct;
        }
        continue;
      }

      // Skip true ID duplicates (same PAR/PSI/EXT id appearing twice)
      if (byId.has(id)) continue;

      const normalized = {
        id,
        question: q.question.trim(),
        answers: q.answers.map(a => a.trim()),
        correct: q.correct ?? null,
        subject: q.subject || 'General',
        acs_code: q.acs_code || null,
        plt_code: q.plt_code || null,
        figure: q.figure || null,
        source: q.source || 'unknown',
      };

      byId.set(id, result.length);
      byText.set(textKey, result.length);
      result.push(normalized);
    }
  }

  // Sort: PAR first, then PSI, then EXT -- numeric within each prefix
  result.sort((a, b) => {
    const [ap, an] = sortKey(a.id);
    const [bp, bn] = sortKey(b.id);
    if (ap !== bp) return ap - bp;
    return an - bn;
  });

  return result;
}

/**
 * Returns summary statistics for the merged question set.
 */
export function summarize(questions) {
  const bySubject = {};
  const bySources = {};
  let withCorrectAnswer = 0;
  let withAcsCode = 0;

  for (const q of questions) {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
    bySources[q.source] = (bySources[q.source] || 0) + 1;
    if (q.correct !== null) withCorrectAnswer++;
    if (q.acs_code) withAcsCode++;
  }

  return {
    total: questions.length,
    withCorrectAnswer,
    withAcsCode,
    bySubject,
    bySources,
  };
}
