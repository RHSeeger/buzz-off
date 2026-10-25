# Buzz Off

A daily word puzzle: how many words can you make with 7 letters? Every word must use the center letter. Score points,
climb the ranks to Genius, keep your streak going, and collect badges.

It's a static web app (TypeScript, built with webpack), playable on phones and desktop, installable to the home screen,
and it works offline. A shared family mode is planned (see `design/todo.md`).


## Technical Details
- TypeScript (strict), HTML and CSS; no runtime dependencies or framework
- Webpack builds `src/` into `dist/`; Jest tests in `tests/`; ESLint + Prettier
- Progress, stats and badges are kept in the browser's localStorage
- The word list is derived from [SCOWL](http://wordlist.aspell.net/) (see `src/static/data/LICENSE-wordlist.txt`)

See `design/` for how the code and the game are put together, and `CLAUDE.md` for the coding rules.


## Useful Notes

- Build: `npm run build` (output in `dist/`)
- Run locally: `npm start` → http://localhost:3000 (also reachable from phones on the same network, at this computer's
  IP address). The service worker is skipped on localhost; add `?sw` to the address to test offline play.
- Test: `npm run test` · Lint: `npm run lint` (`npm run lint:fix` to fix formatting)
- Rebuild the word and puzzle lists: `npm run build:words` (downloads SCOWL once into `tools/.cache/`). This changes
  answers, so bump `WORDLIST_VERSION` in `src/typescript/data/app.ts` and see `design/decisions.md`.
- Rebuild the icons: `npm run build:icons`

Publishing: every push to `main` is linted, tested, built and published to GitHub Pages by
`.github/workflows/deploy-pages.yml` (if the lint or tests fail, nothing is published). It can also be run by hand
from the Actions tab. One-time setup: Settings > Pages > Source: "GitHub Actions".

Loading the NYT puzzle: Menu → "Load today's NYT puzzle" explains how to set up and use the bookmarklet. The field names
it reads from the NYT page are not verified yet (see `design/todo.md`).
