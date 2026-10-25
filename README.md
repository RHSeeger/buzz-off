# Buzz Off

A daily "find words from 7 letters" puzzle. It's a static site: plain HTML, CSS and
vanilla JavaScript ES modules, with no build step. It's meant for GitHub Pages.

**Status:** solo mode is complete. It includes the daily puzzle, hints, rankings, yesterday's
answers, stats, streaks, badges, PWA install, dark mode and manual NYT puzzle import.
Family mode (Firebase: sign-in, shared found words, invites) is **not built yet**.

## Run locally

```sh
node tools/serve.mjs        # http://localhost:8080/ (also prints LAN URLs for phones)
npm test                    # node:test unit tests (Node 20+)
```

On `localhost` the service worker is skipped so your edits show up on reload.
Open `http://localhost:8080/?sw` to test offline caching and the update toast.

## How it works

- `data/words.txt` is the answer list: SCOWL American English, size 50. Words are
  lowercase a–z only, 4+ letters, at most 7 distinct letters, no `s`, and not on
  `tools/blocklist.txt`.
- `data/puzzles.txt` has one puzzle per line: center letter, then the 6 outer letters.
  Every line comes from a pangram, has 20–70 answers, a max score ≤ 320 and ≤ 4 pangrams.
  Each letter set is used only once, so the same pangram never appears on two days.
  The list is shuffled with a fixed seed and lasts about 9 years.
- Daily puzzle = `puzzles[daysSince(2026-01-01) mod length]`. Answers are computed in the
  browser with 26-bit letter masks, so every device gets the same puzzle and nothing
  needs storing.
- Progress, stats and badges live in `localStorage` (keys prefixed `buzzoff:`). If storage
  is unavailable, the game still works but forgets your progress.

## Regenerating data

```sh
node tools/build-wordlist.mjs            # downloads SCOWL once into tools/.cache/
node tools/build-wordlist.mjs --size 60  # bigger list (adds less common words)
node tools/make-icons.mjs                # regenerate icons/
```

Changing the word list or the puzzle list changes past and future answers.
When you do, bump `WORDLIST_VERSION` in `js/config.js`, and deploy deliberately.

## Deploying

The repo root is the site, and every path is relative, so it works under
`https://<user>.github.io/<repo>/`. **Bump `VERSION` in `sw.js` on every deploy**.
Installed copies then show "Update available — Reload" instead of serving stale code.

## Importing the NYT puzzle

Menu → "Load today's NYT puzzle" shows the setup steps and a bookmarklet. You run the
bookmarklet on the NYT puzzle page, and it reopens this game with `#nyt=<payload>`.
The game validates the payload, clears it from the URL and loads it. You can import only
until you've found your first word of the day; after that the day is locked.
Nothing NYT-related is fetched automatically or stored in this repo.

> The bookmarklet reads `window.gameData.today` (`printDate`, `centerLetter`,
> `outerLetters`, `pangrams`, `answers`). Those field names are **unverified**. To check
> them, open the NYT page in a desktop browser and run
> `JSON.stringify(Object.keys(window.gameData.today))` in the console.

## Layout

```
index.html, manifest.webmanifest, sw.js, css/styles.css, icons/
js/app.js            entry point; game state and wiring
js/config.js         constants (name, ranks, epoch, word-list version)
js/prng.js           seeded PRNG + hash (shared with the build script)
js/dates.js          day keys in a timezone, date math
js/wordlist.js       word list loading + letter masks
js/puzzle.js         selection, answers, scoring, ranks, hints
js/day.js            per-day state, source choice, locking
js/stats.js          per-day summaries, lifetime stats, streaks
js/achievements.js   tiered badges + one-off achievements
js/nyt.js            import payload parse/validate
js/bookmarklet.js    bookmarklet generator
js/storage.js        try/catch-wrapped localStorage
js/ui/*              hive, modals, toasts, progress, and each screen
tools/               build-wordlist, make-icons, serve, blocklist
tests/               node:test unit tests
data/                generated word + puzzle lists, word list license
```
