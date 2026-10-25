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

## 2026-10-24 — Family play: local or family mode, kept until switched
**Decision:** The player chooses who they play with: "Just me" (localStorage) or one of their families (Firebase). The
choice is saved and used every day until they switch. Local and family games are separate; switching never moves or
merges words. Members stay in a family until they leave or are removed, so switching back needs no invite link; the
list of families is kept in Firebase under the player's user.
**Why:** Asked for. Keeping the two games separate avoids confusing merges (which words count, whose credit).
**Affects:** game-design.md (Family Play); code-design.md (State, Family Play); `familyController.ts`
**Status:** Active

## 2026-10-24 — Sign in as a guest, with optional Google sign-in
**Decision:** Family players start as anonymous (guest) Firebase users; "Sign in with Google" (a popup) upgrades the
guest in place, keeping its user id. If the Google account was used before, the guest's history and badges are merged
into it, and its families rejoined with the invite codes saved on the device.
**Why:** No account is needed to join (kids may not have Google accounts), but families can still follow a player
across devices. Popups rather than redirects, because redirects are unreliable off Firebase's own domain.
**Affects:** game-design.md (Family Play); `family/firebase.ts`
**Status:** Active

## 2026-10-24 — Three scopes of stats and badges
**Decision:** Stats and badges are kept separately for local play, for the player in each family, and for the player
across all their families. Family stats count the words the player found first, with the family's rank for the day
(Genius and Perfect days are days the family reached them, when the player played). Family history and badges are
stored in Firebase under the player (`users/<uid>`), so they follow a signed-in player across devices.
**Why:** Asked for: "me, personally", "me with this family", "me across all families".
**Affects:** game-design.md (Stats and Badges in Family Play); code-design.md (Family Play)
**Status:** Active

## 2026-10-24 — Any member can read the invite code
**Decision:** The original plan let only a family's owner read its invite code. Now any member can (so anyone can
invite), but only the owner can make a new one or remove members.
**Why:** Simpler for families: whoever is at hand can send the link. Members are trusted, and the owner can still
make a new link if one gets out.
**Affects:** `database.rules.json` (invites); game-design.md (Family Play)
**Status:** Active

## 2026-10-24 — Rules checked against the real project, not the emulator
**Decision:** The security rules are checked by `npm run check:rules`, which runs against the real Firebase project
through its REST API with throwaway guest users, and cleans up after itself. Unit tests check the shape of the
game's writes (with Firebase mocked).
**Why:** The Firebase emulator needs Java, which the developer would rather not install; unit tests alone can't show
the rules work.
**Affects:** `tools/check-rules.ts`; SETUP-FIREBASE.md; `tests/family/`
**Status:** Active

## 2026-10-24 — Firebase as a bundled package, loaded only for family play; production builds
**Decision:** The official `firebase` npm package is bundled by webpack (rather than loaded from Google's CDN), in
its own chunk loaded with `import()` the first time family play is used. `npm run build` now builds in production mode
(minified), `npm start` in development mode.
**Why:** Typed, versioned with the rest of the code, and players who only play locally never download it. A
production build keeps the download small on phones.
**Affects:** code-design.md (Build and Deploy); `webpack.config.js`; `package.json`
**Status:** Active

## 2026-10-24 — NYT bookmarklet's field names confirmed
**Decision:** The NYT page's `window.gameData.today` has `printDate`, `centerLetter`, `outerLetters`, `pangrams` and
`answers` (and `displayWeekday`, `displayDate`, `validLetters`, `id`, `freeExpiration`, `editor`), as the bookmarklet
assumed. No change needed.
**Why:** Checked in a desktop browser's console.
**Affects:** `gamelogic/bookmarklet.ts`
**Status:** Active

## 2026-10-25 — Family players see only their own words until they choose to see everyone's
**Decision:** In family play, each day starts showing a player only the words they found, with their own score, rank,
progress bar and celebrations; hints count what's left from their point of view, and the Stats table shows others'
longest words only as a length. Entering a word someone else found adds it to their list (not their score). "Show
everyone's words" (asked to confirm) shows every word and the family's score and rank for the rest of that day; it
can be switched back. The choice is saved on the device (`familyView`), not in Firebase, so no rules change. Stats,
badges and the saved history keep using the family's rank.
**Why:** Asked for, so seeing the family's words doesn't spoil a player's own search. Per day, so each day starts
fresh. On the device because it is only about what one screen shows; keeping it out of Firebase avoids changing
`database.rules.json`. It isn't secret: every member's game still receives every word.
**Affects:** game-design.md (Family Play); code-design.md (State, Family Play); `session.ts`, `familyController.ts`,
`app.ts`, `gamelogic/familyDay.ts`, `ui/statsView.ts`; resolves the "Hide others' words" open question
**Status:** Active