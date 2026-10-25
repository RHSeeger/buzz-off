# Decision Log

A record of design and architecture decisions: what was decided, when, and why.

- `game-design.md` and `code-design.md` describe how things are **now**. This file records **how they got that way**.
- When a decision is made or changed, update the relevant design file **and** add an entry here.
- Entries are only ever added, never deleted. When a decision is replaced, change the old entry's **Status** to
  `Superseded by <date> — <title>` and add a new entry.
- Entries are in chronological order (newest at the bottom).

Entry format:

```markdown
## YYYY-MM-DD — Short title
**Decision:** What was decided.
**Why:** The reasoning behind it.
**Affects:** Which design files / areas of the code this touches.
**Status:** Active | Superseded by <date> — <title>
```

---

## 2026-10-24 — A static site, with state in localStorage (Firebase later, for families)
**Decision:** The game is a static site on GitHub Pages: no server of our own. Solo play keeps everything in
localStorage. Family mode (shared found words, credit for who found each word) will use Firebase Realtime Database
directly from the browser, and isn't built yet.
**Why:** Free hosting, nothing to run or maintain. Firebase's free plan covers a handful of families.
**Affects:** code-design.md (State); todo.md (family mode)
**Status:** Active

## 2026-10-24 — Precomputed, shuffled puzzle list; answers computed in the browser
**Decision:** `tools/build-wordlist.ts` writes the word list and an ordered puzzle list (from SCOWL size 50, no S,
20-70 answers, max score ≤ 320, ≤ 4 pangrams, one center per letter set, shuffled with a fixed seed). Day N plays line
N from 2026-01-01. Answers are computed in the browser with letter masks.
**Why:** Every device gets the same puzzle with nothing stored or fetched per day; no repeats for about 9 years; size 50
keeps answers to common words. One center per letter set because the same pangrams on two days would feel like a
repeat.
**Affects:** code-design.md (The Daily Puzzle); game-design.md (The Puzzle)
**Status:** Active

## 2026-10-24 — Our own name, rank names and badges; look modelled on the well-known hive puzzle
**Decision:** The game is called Buzz Off, with its own rank names (Seedling ... Genius, Perfect). The layout and colors
follow the familiar daily hive puzzle, but no NYT name or branding is used, apart from the plain-text "Load today's NYT
puzzle" option. Achievements, stats and badges are added.
**Why:** Familiar to play, without copying anyone's branding.
**Affects:** game-design.md
**Status:** Active

## 2026-10-24 — NYT puzzle import by bookmarklet only, locked after the first word
**Decision:** The NYT puzzle can only be loaded by the player running a bookmarklet on the NYT page (or pasting its
data). Nothing is fetched automatically, committed, or shared. A day's puzzle can only change until the first word is
found.
**Why:** Keeps NYT data off our servers and out of the repo; locking stops the score being mixed across two puzzles.
**Affects:** game-design.md (The NYT Puzzle); code-design.md (General)
**Status:** Active

## 2026-10-24 — Service worker only reloads the page when the player asks
**Decision:** A new service worker waits until the player taps "Reload". The page doesn't reload on the first install
(when the worker takes control). The worker is skipped on localhost unless `?sw` is in the address.
**Why:** The first-install reload was reopening the welcome screen and losing an incoming NYT import. Skipping it on
localhost means edits show up on reload during development.
**Affects:** code-design.md (Build and Deploy); `src/typescript/app.ts` (registerServiceWorker)
**Status:** Active

## 2026-10-24 — TypeScript, webpack, src/ and dist/, the same setup as blocks-game
**Decision:** The code moved from plain JavaScript modules (served as-is, no build step) to TypeScript in strict mode,
built by webpack from `src/` into `dist/`, with Jest tests, ESLint and Prettier, a CLAUDE.md and this `design/`
folder: the same structure as the blocks-game project. `dist/` is published by a GitHub Actions workflow.
`src/static/` is copied to the build by a small plugin in `webpack.config.js` (rather than adding a package). The
service worker is a second webpack entry, so it is TypeScript too; its cache is named after the build, so it no longer
needs a version bumped by hand. The build tools are TypeScript, run through ts-node (`tools/run.cjs`).
**Why:** Asked for, to match blocks-game. It replaces the original plan's "no build step" rule.
**Affects:** everything; code-design.md (Folder Layout, Build and Deploy); CLAUDE.md
**Status:** Active
