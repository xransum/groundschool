/**
 * PDF scraper for FAA Private Pilot question banks.
 *
 * Pulls from two archived Wayback Machine sources:
 *  1. par_questions.pdf (2021, newer format, PAR-only, 61 questions)
 *  2. pvt.pdf (2013, full bank format, 96 questions, mixed airplane/helicopter)
 *
 * Both are U.S. Government works -- public domain.
 *
 * NOTE: Neither PDF includes an answer key. The FAA never published correct
 * answers alongside the question bank. The `correct` field will be null for
 * all PDF-sourced questions.
 */

import fetch from 'node-fetch';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const SOURCES = [
  {
    name: 'par_questions.pdf (2021)',
    url:
      'https://web.archive.org/web/20210319201440/' +
      'https://www.faa.gov/training_testing/testing/test_questions/media/par_questions.pdf',
    format: 'par2021',
  },
  {
    name: 'pvt.pdf (2013)',
    url:
      'https://web.archive.org/web/20131020185926/' +
      'http://www.faa.gov/training_testing/testing/test_questions/media/pvt.pdf',
    format: 'pvt2013',
  },
];

async function fetchPdf(url, name) {
  console.log(`  Downloading ${name}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = await res.arrayBuffer();
  console.log(`  Downloaded ${(buf.byteLength / 1024).toFixed(1)} KB`);
  return Buffer.from(buf);
}

/**
 * Parses the 2021 par_questions.pdf format:
 *
 *   1. Question text
 *   A.  Answer A
 *   B. Answer B
 *   C. Answer C
 *   Metadata:  ACSCode : PA.I.B.K1b
 */
function parsePar2021(rawText) {
  const questions = [];
  const text = rawText.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let i = 0;
  let lastNum = 0;

  while (i < lines.length) {
    const line = lines[i];
    const qStart = line.match(/^(\d+)\.\s*(.*)/);
    if (!qStart) { i++; continue; }

    const num = parseInt(qStart[1], 10);
    if (num < lastNum) { i++; continue; }
    lastNum = num;
    i++;

    const questionLines = [];
    if (qStart[2].trim()) questionLines.push(qStart[2].trim());

    while (i < lines.length) {
      const l = lines[i];
      if (/^[ABC]\.\s*\S/.test(l)) break;
      if (/^Metadata:/.test(l)) break;
      if (/^\d+\.\s/.test(l)) break;
      questionLines.push(l);
      i++;
    }

    const questionText = questionLines.join(' ').trim();
    if (!questionText) continue;

    const answers = [];
    for (const letter of ['A', 'B', 'C']) {
      if (i < lines.length && lines[i].match(new RegExp(`^${letter}\\.\\s+`))) {
        const ansText = lines[i].replace(/^[ABC]\.\s*/, '').trim();
        i++;
        const cont = [ansText];
        while (
          i < lines.length &&
          !/^[ABC]\.\s+\S/.test(lines[i]) &&
          !/^Metadata:/.test(lines[i]) &&
          !/^\d+\.\s/.test(lines[i])
        ) {
          cont.push(lines[i]);
          i++;
        }
        answers.push(cont.join(' ').trim());
      }
    }

    if (answers.length < 2) continue;

    let acsCode = null;
    if (i < lines.length && /^Metadata:/.test(lines[i])) {
      const m = lines[i].match(/ACSCode\s*:\s*([A-Za-z0-9.]+)/);
      if (m) acsCode = m[1];
      i++;
    }

    const figureMatch = questionText.match(/[Ff]igure\s+(\d+[A-Z]?)/);

    questions.push({
      id: `PAR-${String(num).padStart(4, '0')}`,
      question: questionText,
      answers,
      correct: null,
      subject: deriveSubjectFromAcs(acsCode),
      acs_code: acsCode,
      plt_code: null,
      figure: figureMatch ? `Figure ${figureMatch[1]}` : null,
      source: 'pdf',
    });
  }

  return questions;
}

/**
 * Parses the 2013 pvt.pdf format:
 *
 *   1. PLT168
 *   PVT
 *   The term `angle of attack` is defined as the angle between the
 *   A) chord line of the wing and the relative wind.
 *   B) airplane`s longitudinal axis ...
 *   C) airplane`s center line ...
 *
 * Or on one line:
 *   2. PLT025 PVT
 *   Which statement relates to Bernoulli`s principle?
 *   A) ...
 */
function parsePvt2013(rawText) {
  const questions = [];
  const text = rawText.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let i = 0;
  let lastNum = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match "N. PLT... PVT" or "N. PLT..." or "N. PVT"
    const qStart = line.match(/^(\d+)\.\s+(PLT\d+)?\s*(PVT)?\s*(.*)/i);
    if (!qStart) { i++; continue; }

    const num = parseInt(qStart[1], 10);
    if (num < lastNum) { i++; continue; }
    lastNum = num;
    const pltCode = qStart[2] ? qStart[2].toUpperCase() : null;
    i++;

    // Skip "PVT" line if it's on its own line
    if (i < lines.length && /^PVT\s*$/i.test(lines[i])) i++;
    // Skip another PLT line if the PLT code was on a separate line
    if (i < lines.length && /^PLT\d+/i.test(lines[i])) {
      const altPlt = lines[i].match(/^(PLT\d+)/i);
      i++;
    }

    const questionLines = [];
    const restOfStart = qStart[4] ? qStart[4].trim() : '';
    if (restOfStart) questionLines.push(restOfStart);

    while (i < lines.length) {
      const l = lines[i];
      if (/^[ABC]\)\s+/.test(l)) break;
      if (/^\d+\.\s+(PLT|PVT)/.test(l)) break;
      questionLines.push(l);
      i++;
    }

    const questionText = questionLines.join(' ').trim();
    if (!questionText) continue;

    const answers = [];
    for (const letter of ['A', 'B', 'C']) {
      if (i < lines.length && lines[i].match(new RegExp(`^${letter}\\)\\s+`))) {
        const ansText = lines[i].replace(/^[ABC]\)\s*/, '').trim();
        i++;
        const cont = [ansText];
        while (
          i < lines.length &&
          !/^[ABC]\)\s+/.test(lines[i]) &&
          !/^\d+\.\s+(PLT|PVT)/.test(lines[i])
        ) {
          cont.push(lines[i]);
          i++;
        }
        answers.push(cont.join(' ').trim());
      }
    }

    if (answers.length < 2) continue;

    const figureMatch = questionText.match(/[Ff]igure\s+(\d+[A-Z]?)/);

    questions.push({
      id: `PVT-${String(num).padStart(4, '0')}`,
      question: questionText,
      answers,
      correct: null,
      subject: deriveSubjectFromPlt(pltCode),
      acs_code: null,
      plt_code: pltCode,
      figure: figureMatch ? `Figure ${figureMatch[1]}` : null,
      source: 'pdf',
    });
  }

  return questions;
}

function deriveSubjectFromAcs(acsCode) {
  if (!acsCode) return 'General';
  const m = acsCode.match(/^PA\.([IVX]+)\./);
  if (!m) return 'General';
  const map = {
    'I':    'Preflight Preparation',
    'II':   'Preflight Procedures',
    'III':  'Airport Operations',
    'IV':   'Takeoffs, Landings, and Go-Arounds',
    'V':    'Performance Maneuvers',
    'VI':   'Navigation',
    'VII':  'Slow Flight and Stalls',
    'VIII': 'Basic Instrument Maneuvers',
    'IX':   'Emergency Operations',
    'X':    'Multiengine Operations',
    'XI':   'Night Operations',
    'XII':  'Postflight Procedures',
  };
  return map[m[1]] || 'General';
}

function deriveSubjectFromPlt(pltCode) {
  if (!pltCode) return 'General';
  const code = parseInt(pltCode.replace('PLT', ''), 10);
  if (code >= 1   && code <= 50)  return 'Regulations';
  if (code >= 51  && code <= 100) return 'Navigation';
  if (code >= 101 && code <= 150) return 'Aircraft Systems';
  if (code >= 151 && code <= 200) return 'Weather';
  if (code >= 201 && code <= 300) return 'Aerodynamics';
  if (code >= 301 && code <= 400) return 'Airport Operations';
  if (code >= 401 && code <= 500) return 'Emergency Procedures';
  return 'General';
}

export async function scrapePdf() {
  const all = [];

  for (const src of SOURCES) {
    try {
      const buf = await fetchPdf(src.url, src.name);
      console.log('  Parsing PDF text...');
      const data = await pdfParse(buf);
      console.log(`  Extracted ${data.text.length.toLocaleString()} chars across ${data.numpages} pages`);

      const questions =
        src.format === 'par2021' ? parsePar2021(data.text) : parsePvt2013(data.text);
      console.log(`  Parsed ${questions.length} questions from ${src.name}`);
      all.push(...questions);
    } catch (err) {
      console.warn(`  WARNING: Could not process ${src.name}: ${err.message}`);
    }
  }

  return all;
}
