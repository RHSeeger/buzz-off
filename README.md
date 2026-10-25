# Buzz Off

A daily word puzzle: how many words can you make with 7 letters? Every word must use the center letter. Score points,
climb the ranks to Genius, keep your streak going, and collect badges.

It's a static web app (TypeScript, built with webpack), playable on phones and desktop, installable to the home screen,
and it works offline. Play on your own, or with your family: everyone shares one puzzle and one list of words each
day, and each word counts for whoever found it first.


## Technical Details
- TypeScript (strict), HTML and CSS; no framework
- Family play uses Firebase (Auth and Realtime Database), loaded only when it's used. Set it up with
  **SETUP-FIREBASE.md**; until then the game only plays locally. The Firebase config in
  `src/typescript/data/firebaseConfig.ts` is public by design: the security rules (`database.rules.json`) are what
  protect the data.
- Webpack builds `src/` into `dist/`; Jest tests in `tests/`; ESLint + Prettier
- Local play's progress, stats and badges are kept in the browser's localStorage; family play's are in Firebase
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
- Check the Firebase security rules: `npm run check:rules` (after setup, and after any change to the rules)

Publishing: every push to `main` is linted, tested, built and published to GitHub Pages by
`.github/workflows/deploy-pages.yml` (if the lint or tests fail, nothing is published). It can also be run by hand
from the Actions tab. One-time setup: Settings > Pages > Source: "GitHub Actions".

Loading the NYT puzzle: Menu → "Load today's NYT puzzle" explains how to set up and use the bookmarklet.
