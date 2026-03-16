# groundschool

Free, open-source FAA Private Pilot written test and oral exam prep. Runs as a
static SPA (React + Vite) deployable to GitHub Pages with no backend required.

Live site: https://xransum.github.io/groundschool/

---

## What it covers

- **Written (knowledge) test** -- multiple-choice quiz mode drawn from the FAA
  PAR question bank. Shuffle questions, filter by subject area, set a time
  limit. Pass threshold is 70%, matching the actual exam requirement.
- **Oral exam prep** -- flashcard-style review of common checkride topics
  (airspace, regulations, weather, aircraft systems, aerodynamics, ADM, etc.)
- **Acronym tooltips** -- every piece of text on the site highlights recognized
  aviation acronyms with hover/tap tooltips showing their definitions.

---

## Data sources

All question data is U.S. Government work and in the public domain.

| File | Source |
|------|--------|
| `src/data/questions.json` | FAA PAR question bank PDFs (Wayback Machine archives) |
| `src/data/acronyms.json` | [xransum/pplground](https://github.com/xransum/pplground) acronym dataset |
| `src/data/oral-exam.json` | Hand-curated checkride topic cards (committed to repo) |

**Important:** The FAA has never published an official answer key alongside the
question bank. The `correct` field is `null` for all PDF-sourced questions.
This is a known limitation -- not a bug.

---

## Development setup

Requires Node.js >= 18.

```
npm install
```

### Re-scrape data (rarely needed)

The scraped data files are committed to the repo. You only need to re-run the
scraper if the FAA updates the question bank or if you want to refresh acronyms.

```
node bin/groundschool.js scrape --skip-psi
```

Omit `--skip-psi` to also attempt scraping the PSI sample test portal
(requires Playwright and a working browser install).

After scraping, commit the updated `src/data/questions.json` and
`src/data/acronyms.json`.

### Build the site

```
node bin/groundschool.js build
```

Output goes to `dist/`. The base path defaults to `/groundschool/` (set via
`VITE_BASE_PATH` env var if you need a different path).

```
VITE_BASE_PATH=/my-path/ node bin/groundschool.js build
```

---

## Deploying to GitHub Pages

1. Build the site: `node bin/groundschool.js build`
2. Push `dist/` to the `gh-pages` branch:

```
git subtree push --prefix dist origin gh-pages
```

Or use the `gh-pages` npm package:

```
npx gh-pages -d dist
```

3. In your repo settings, set Pages source to the `gh-pages` branch, root folder.

---

## Project structure

```
bin/
  groundschool.js       CLI entry point
src/
  cli/
    scrape.js           scrape command
    build.js            build command
  scraper/
    pdf.js              FAA PDF parser (two archive formats)
    psi.js              PSI portal scraper (optional supplement)
    acronyms.js         pplground acronym fetcher
    normalize.js        merge/dedup pipeline
  data/
    questions.json      question bank (committed, populated by scrape)
    acronyms.json       acronym map (committed, populated by scrape)
    oral-exam.json      oral exam cards (hand-curated, committed)
  site/
    vite.config.js
    index.html
    main.jsx
    components/         React components (App, Nav, QuizMode, Results, ...)
    hooks/              useQuiz, useAcronyms
    styles/             index.css (Tailwind + theme)
dist/                   build output (gitignored)
```

---

## License

MIT. Question data is U.S. Government work, public domain.
