/**
 * PSI portal scraper for FAA sample test questions.
 *
 * The official free sample test portal at https://faa.psiexams.com/FAA/login
 * provides browser-based access to sample PAR questions. This scraper uses
 * Playwright to navigate the portal and extract questions that may not appear
 * in the archived PDF.
 *
 * This is a supplement to the PDF scraper -- the PDF is the primary source.
 * Questions already present (matched by normalized question text) are skipped
 * during the normalize/dedup step.
 *
 * NOTE: This scraper is only needed on the initial data collection run.
 * Once data is committed to the repo, it does not need to run again.
 */

import { chromium } from 'playwright';

const PSI_URL = 'https://faa.psiexams.com/FAA/login';
// PAR = Private Pilot Airplane test code
const PAR_TEST_CODE = 'PAR';

/**
 * Attempts to scrape sample questions from the PSI portal.
 * Returns an array of question objects (may be empty if portal changes).
 */
export async function scrapePsi() {
  console.log('  Launching headless browser for PSI portal...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const questions = [];

  try {
    await page.goto(PSI_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('  Loaded PSI portal login page');

    // Look for a "Guest" or "Sample Test" entry point that doesn't require login
    const guestSelectors = [
      'a:has-text("Guest")',
      'a:has-text("Sample")',
      'button:has-text("Guest")',
      'button:has-text("Sample")',
      '[href*="guest"]',
      '[href*="sample"]',
    ];

    let foundEntry = false;
    for (const sel of guestSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        foundEntry = true;
        console.log(`  Found guest entry via selector: ${sel}`);
        break;
      }
    }

    if (!foundEntry) {
      console.log('  No guest entry point found on PSI portal -- skipping PSI scrape');
      return [];
    }

    // Wait for test selection or question list
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Try to select PAR test if a test picker is shown
    const parLink = page.locator(`text=${PAR_TEST_CODE}`).first();
    if (await parLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parLink.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }

    // Extract questions from the page -- the portal renders one question at a time
    // or shows a list. We iterate through all available questions.
    let pageNum = 0;
    const maxPages = 300; // safety limit

    while (pageNum < maxPages) {
      const q = await extractQuestionFromPage(page);
      if (!q) break;

      questions.push({ ...q, source: 'psi' });
      pageNum++;

      // Try to advance to the next question
      const nextBtn = page.locator('button:has-text("Next"), [aria-label*="next"]').first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      } else {
        break;
      }
    }

    console.log(`  Extracted ${questions.length} questions from PSI portal`);
  } catch (err) {
    console.warn(`  PSI scrape warning: ${err.message}`);
    console.warn('  Continuing without PSI data -- PDF questions will still be used');
  } finally {
    await browser.close();
  }

  return questions;
}

/**
 * Extracts a single question from the current page state.
 * Returns null if no recognizable question structure is found.
 */
async function extractQuestionFromPage(page) {
  try {
    // Common selectors for PSI portal question structure
    const questionEl = await page
      .$('*css=.question-text, [class*="question"], [id*="question"]')
      .catch(() => null);

    if (!questionEl) return null;

    const questionText = await questionEl.innerText().catch(() => '');
    if (!questionText.trim()) return null;

    // Extract answer choices
    const choiceEls = await page
      .$$('*css=.answer-choice, [class*="answer"], [class*="choice"], label')
      .catch(() => []);

    const answers = [];
    for (const el of choiceEls.slice(0, 3)) {
      const text = await el.innerText().catch(() => '');
      const cleaned = text.replace(/^[ABC][.)]\s*/, '').trim();
      if (cleaned) answers.push(cleaned);
    }

    if (answers.length < 2) return null;

    return {
      id: null,  // PSI portal does not expose question IDs
      question: questionText.trim(),
      answers,
      correct: null,  // PSI does not reveal correct answer until after submit
      subject: null,
      acs_code: null,
      plt_code: null,
      figure: null,
    };
  } catch {
    return null;
  }
}
