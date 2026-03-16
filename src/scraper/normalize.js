/**
 * Merges and deduplicates questions from multiple sources (PDF, PSI portal)
 * into a single canonical questions.json dataset.
 *
 * Dedup strategy:
 *  - Primary key is question ID (PAR-XXXX) when available
 *  - For questions without IDs (PSI source), normalized question text is used
 *  - PDF questions take precedence over PSI questions for the same content
 *    because they include the correct answer
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
 * Merges questions from multiple source arrays, deduplicating by question ID
 * and by normalized question text.
 *
 * Sources are processed in priority order -- earlier sources win on conflict.
 * Expected order: [pdfQuestions, psiQuestions]
 */
export function mergeQuestions(sources) {
  const byId = new Map();
  const byText = new Map();
  const result = [];
  let psiIndex = 0;

  for (const sourceList of sources) {
    for (const q of sourceList) {
      const id = q.id || assignId(q, psiIndex++);
      const textKey = normalizeText(q.question);

      // Skip if we already have this question (by ID or by text)
      if (byId.has(id)) continue;
      if (byText.has(textKey)) continue;

      const normalized = {
        id,
        question: q.question.trim(),
        answers: q.answers.map(a => a.trim()),
        correct: q.correct,
        subject: q.subject || 'General',
        acs_code: q.acs_code || null,
        plt_code: q.plt_code || null,
        figure: q.figure || null,
        source: q.source || 'unknown',
      };

      byId.set(id, true);
      byText.set(textKey, true);
      result.push(normalized);
    }
  }

  // Sort: PAR questions first (by numeric ID), then PSI supplements
  result.sort((a, b) => {
    const aNum = parseInt(a.id.replace(/\D/g, ''), 10) || 99999;
    const bNum = parseInt(b.id.replace(/\D/g, ''), 10) || 99999;
    return aNum - bNum;
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
