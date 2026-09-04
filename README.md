# Deutsch Üben — German A1–B2 Practice

A zero-build, client-only web app for practicing German grammar, vocabulary, and
pronunciation from A1 to B2. Pure HTML/CSS/JS with ES modules — no bundler,
no framework, no server — so it deploys to GitHub Pages by just pushing files.

## Why this stack

| Concern | Choice | Why |
|---|---|---|
| Framework | None — vanilla JS + ES modules | Zero build step = GitHub Pages works by just pushing the repo. No `npm run build`, no dist folder, no CI needed. |
| Styling | Hand-written CSS with custom properties | Full control over a distinctive visual identity, tiny payload, no Tailwind purge/build step. |
| Routing | Tiny hash router (`js/router.js`) | `#/grammar/pronouns` style URLs work on static hosting with no server-side rewrite rules — a common GitHub Pages gotcha with real path routing. |
| State | `localStorage`, namespaced (`js/storage.js`) | Progress, SRS flashcard state, speaking history, and API keys all persist per-device with no backend. |
| Dynamic content | Direct client-side calls to OpenAI or Gemini (`js/api.js`) | You paste your own key in Settings; requests go straight from your browser to the provider. No server to host or pay for. |
| Speech | Web Speech API (`js/speech.js`) | Native browser speech recognition + synthesis, free, no API key required, works on mobile Chrome/Safari. |

## Project structure

```
german-master/
├── index.html              # App shell: nav + #app mount point
├── css/style.css            # Full design system (tokens, components, responsive rules)
├── data/
│   ├── grammar-topics.json  # All grammar topics + exercises, tagged by level/case
│   └── vocab.json           # Flashcard vocabulary, tagged by level
└── js/
    ├── app.js               # Route registration / bootstrap
    ├── router.js             # Minimal hash router with :params and ?query support
    ├── storage.js             # localStorage wrapper (progress, SRS, settings)
    ├── srs.js                  # Spaced-repetition scheduler (SM-2 style, 6 boxes)
    ├── api.js                   # OpenAI / Gemini calls for dynamic exercise & vocab generation
    ├── speech.js                 # Web Speech API: recognition, synthesis, scoring
    ├── quizEngine.js               # Builds/filters exercise pools from static data
    ├── utils.js                     # h() DOM builder, shuffle, badges, shape icons
    ├── vocabData.js                  # Cached vocab loader (merges AI-generated cards)
    └── views/
        ├── home.js                    # Dashboard
        ├── grammar.js                  # Topic list + single-topic practice
        ├── quizRunner.js                # Shared quiz UI (used by grammar + custom quiz)
        ├── customQuiz.js                  # Custom Quiz Builder (multi-select levels/topics/cases)
        ├── flashcards.js                   # Flashcard flip UI + SRS rating
        ├── speaking.js                      # Pronunciation practice
        └── settings.js                       # API key management, data reset
```

## Feature map → requirement

1. **Granular topic breakdown (A1–B2)** → `data/grammar-topics.json` + `views/grammar.js`.
   Currently ships 8 topics (Nouns & Articles, Pronouns, Separable Verbs, Prepositions,
   Word Order, Adjective Endings, Konjunktiv II, Relative Clauses) each tagged with level
   and, where relevant, case. Add more by appending objects to the JSON — no code changes
   needed.
2. **Custom Quiz Builder** → `views/customQuiz.js` + `quizEngine.buildPool()`. Multi-select
   chips for levels, topics, and cases combine into one filtered, shuffled session.
3. **Flashcards with SRS** → `views/flashcards.js` + `srs.js`. Flip animation, "Again / Hard
   / Good / Easy" rating buttons drive a 6-box interval scheduler; due cards resurface first.
4. **Live AI content generation** → `views/settings.js` (key input) + `api.js`
   (`generateExercise`, `generateVocabBatch`). "Generate an AI question" appears inline in
   the quiz runner whenever a key is configured; new cards can be generated from the
   Flashcards screen.
5. **Speech & pronunciation evaluator** → `views/speaking.js` + `speech.js`. Uses
   `SpeechRecognition` to capture what you said and `SpeechSynthesis` to model the target
   sentence; word-level Levenshtein scoring highlights exactly which words were off.
6. **Deployment & responsiveness** → mobile-first CSS (bottom tab bar → sidebar at ≥860px),
   no build step, works from any static host.

## Running locally

No install required:

```bash
cd german-master
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static server works — `npx serve`, VS Code's Live Server, etc. Opening `index.html`
directly via `file://` will NOT work because `fetch()` for the JSON data files requires
`http://`.)

## Deploying to GitHub Pages

1. Create a new GitHub repository (or use an existing one) and push this folder's contents
   to the repo root:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Deutsch Üben"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   branch `main`, folder `/ (root)`. Save.
3. Wait ~1 minute, then visit `https://<your-username>.github.io/<your-repo>/`.
4. Every future `git push` to `main` redeploys automatically — no CI config needed since
   there's no build step.

**If you deploy into a sub-path** (e.g. `username.github.io/repo-name/`), all asset and
`fetch()` paths in this app are already relative (`css/style.css`, `data/vocab.json`, etc.),
so no path rewriting is needed.

## Using the AI features

1. Get an API key: [OpenAI](https://platform.openai.com/api-keys) or
   [Google AI Studio (Gemini)](https://aistudio.google.com/apikey).
2. In the app, go to **Settings**, choose a provider, paste the key, and save.
3. Keys are stored only in your browser's `localStorage` (`js/storage.js`) and are sent
   directly from your browser to the provider's own API endpoint — this app has no backend
   to intercept or log them. Because GitHub Pages is served over HTTPS, the key never
   travels in plaintext.
4. Anyone using your deployed site enters **their own** key; you are not billed for their
   usage, and no key is bundled into the repo.

> Browser CORS note: both OpenAI's and Google's REST APIs currently accept direct
> browser-origin requests with an API key in the Authorization header/query param, which is
> why no backend proxy is required. If a provider changes their CORS policy in the future,
> you'd need a small serverless proxy (e.g., a Cloudflare Worker) — the call sites are
> isolated to `js/api.js` so that would be a small, contained change.

## Extending the content

- **Add a grammar topic:** append an object to `data/grammar-topics.json` with `id`, `name`,
  `level`, `shape` (`circle` | `square` | `triangle` | `diamond` — used as the topic's icon),
  `description`, `cases` (array, can be empty), and `exercises` (each with `id`, optional
  `case`, `prompt` with `___` for the blank, `options`, `answer`, `explanation`).
- **Add vocabulary:** append to `data/vocab.json` with `id`, `de`, `en`, `level`, `example`.
- **Change the palette/type:** everything is driven by CSS custom properties at the top of
  `css/style.css` (`:root`) — swap `--mustard`, `--blue`, `--red`, fonts, etc. in one place.

## Browser support notes

- Speech recognition (`webkitSpeechRecognition`) works in Chrome, Edge, and Safari (iOS 14.5+).
  Firefox does not support it yet — the Speaking view detects this and shows a warning instead
  of a broken mic button.
- Speech synthesis (`speechSynthesis`) has broad support; German voice quality varies by OS.
