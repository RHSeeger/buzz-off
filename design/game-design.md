## The Puzzle

- Every day there is one puzzle: 7 different letters, one of which is the **center letter**.
- Words must be 4+ letters, use only those letters (repeats allowed), and contain the center letter.
- Every puzzle has at least one **pangram** (a word using all 7 letters). A pangram using each letter exactly once is a
  "perfect" pangram.
- The letter S never appears (it would make plurals too easy).
- The answer list is SCOWL (American English, size 50: common words), with proper nouns, words with apostrophes,
  accents or hyphens, and blocked words (`tools/blocklist.txt`) left out.
- Puzzles have 20-70 answers, a maximum score of at most 320, and at most 4 pangrams. Each letter set is used only once,
  so the same pangram never comes up on two days.
- The day changes at local midnight (the device's timezone). If the game is open over midnight, it moves to the new
  day by itself.

## Scoring and Ranks

- A 4-letter word is worth 1 point; longer words are worth 1 point per letter; a pangram is worth 7 extra.
- Ranks are a percentage of the puzzle's maximum score: Seedling 0%, Sprout 2%, Budding 5%, Growing 8%,
  Blooming 15%, Flourishing 25%, Thriving 40%, Brilliant 50%, Genius 70%, Perfect 100% (every word).
- Reaching Genius or Perfect shows a celebration; other rank-ups show a short message.

## Playing

- The look follows the well-known daily hive puzzle: a honeycomb of 7 hexagons (the center one yellow), the word being
  typed above it, and Delete / Shuffle / Enter buttons below. Our own name and rank names are used; no NYT name or
  branding appears anywhere except the plain-text "Load today's NYT puzzle" option.
- Tap the letters, or type on a keyboard (letters, Backspace, Enter, Space to shuffle).
- In the word being typed, the center letter is yellow, and letters not in the puzzle are grey.
- A rejected word shakes and shows why: Too short · Missing center letter · Bad letters · Not in word list ·
  Already found. An accepted word shows Good! / Nice! / Awesome! / Pangram! with its points.
- The found-words box shows the latest words on one line (on phones), and opens to the full alphabetical list.
  Pangrams are bold. On wide screens it is always open, beside the honeycomb.

## Screens

- **Welcome** (every visit): Play / Continue, the current streak, and how yesterday went.
- **Rankings** (tap the progress track): the score needed for each rank today.
- **Hints**: how many words are left, by first letter and length, and by first two letters. Behind a "Show hints"
  button the first time each day, because opening them rules out the "No Peeking" badge.
- **Yesterday's Answers**: every answer, with the ones found checked, and pangrams in bold.
- **Stats**: today, all time (played, streaks, Genius days, words, points, pangrams, average % of max, longest word),
  and how many days ended at each rank. A second tab shows the badges.
- **Menu**: light / dark / auto; loading today's NYT puzzle (or switching back) before the first word, and setting up
  the NYT bookmarklet at any time; about; erase everything (local play
  only; family play is kept with the family).
- **Who are you playing with?** (the button above the score): see Family Play.

## Streaks

- A day counts as played when at least one word is found.
- The current streak counts days in a row up to today, or up to yesterday if today isn't played yet (so it isn't lost
  until a day is actually missed).

## Badges

- **Milestones** level up through Bronze, Silver, Gold, Platinum and Diamond, from an all-time stat: words found,
  points, pangrams, puzzles played, longest streak, Genius days and Perfect days. The targets are in
  `src/typescript/data/achievements.ts`.
- **Achievements** are earned once, for something done in a puzzle: Flawless (a perfect pangram), Opening Act (a
  pangram as the first word), Double Dip (2+ pangrams), Long Stinger (8+ letters), Marathon Word (10+), Wordsmith (50
  words), Quick Buzz (5 words in 60 seconds), Speed Demon (Genius within 20 minutes of the first word), No Peeking
  (Genius without hints), Full Coverage (a word for every starting letter), Early Bird (4-7am), Night Owl (11pm-4am),
  Weekend Warrior (Genius on Saturday and Sunday), Welcome Back (after a week away), Guest Puzzle (play an imported
  puzzle), Look Back (open yesterday's answers).
- Each new badge pops up once. When several tiers of one badge are passed at once, only the highest is announced.

## The NYT Puzzle (optional)

- A player can play the day's NYT puzzle instead of ours, by running a bookmarklet on the NYT puzzle page, which
  reopens the game with the puzzle in the address's `#`. If that doesn't work, the bookmarklet shows the data to copy,
  and the game has a box to paste it into.
- The game checks the data (7 different letters; every answer valid; at least one pangram) and asks first if it is
  for a different date.
- Which puzzle is played can only change until the first word is found; after that the day is locked in.
- The bookmarklet is made for whichever site the game is running on, so other deployments point at themselves.
- Nothing is fetched automatically, and no NYT data is ever stored anywhere but the player's own device, or (in family
  play) with that family, where only its members can read it.
- In family play the NYT import is only offered to families it has been turned on for, by hand in the Firebase console
  (see SETUP-FIREBASE.md). For such a family, before anything is found, the welcome screen asks which puzzle to play.
  Choosing the NYT one tells the others ("Mom is loading the NYT puzzle (started 8:12am)") so they can wait, or play
  ours instead. Once loaded, everyone's game switches to it.

## Family Play

Family play needs a Firebase project (SETUP-FIREBASE.md). Until one is set up, the game only plays locally.

- **Who you're playing with:** the button above the score says "Just me" or the family's name. Tapping it lists
  "Just me" and every family you're in, to switch between them. The choice is kept, every day, until you switch.
- **Local and family games are separate.** Switching doesn't move or merge words: playing "Just me" in the morning
  and with the family later is two games.
- **One shared game per family:** everyone plays the same puzzle each day (the day changes at midnight in the
  family's timezone, the creator's), with one list of found words. Each word counts for whoever found it first; new
  words appear for everyone straight away. "Already found (by Mom)" says who beat you to it.
- **Who found what:** each found word has a dot in its finder's color, the progress bar is split by player color, and
  the Stats screen shows each member's points, words, pangrams and longest word today. Yesterday's Answers shows who
  found each word.
- **Ranks and celebrations** are the family's: when the family reaches Genius, everyone gets the celebration.
- **Creating a family:** "Create a family" asks for the family's name, and your name and color, then shows the
  invite link to share.
- **Joining:** opening an invite link (`<game>#join=<family>:<code>`) asks for your name and color. You stay a member
  until you leave or are removed, so switching back later doesn't need the link again. A link can also be pasted into
  the "Who are you playing with?" screen.
- **The family screen** (from "Who are you playing with?"): members, the invite link (any member can share it), your
  name and color, and leaving. The family's creator can also remove members, make a new link (old links stop working),
  and delete the family.
- **Signing in:** you play as a guest at first (no account needed; the families are tied to that browser). "Sign in
  with Google" keeps your families, family history and badges with your Google account, so they're on every device you
  sign in on. A guest who signs in keeps everything. (If that Google account had already been used, the guest's
  history and badges are added to it, and their families rejoined if the invite codes still work.)
- **Offline:** words found while offline show straight away, and are sent when the connection comes back, as long as
  the game stays open. The button above the score says "offline" meanwhile.

## Stats and Badges in Family Play

- The Stats screen has a list of whose stats to show:
    - **Just me (this device):** local play.
    - **Me, with <family>:** your play in that family: the words *you* found, with the family's rank for the day (so
      a Genius day is a day the family reached Genius and you played). For the current family, it also shows today's
      members' table.
    - **Me, in all my families** (with 2 or more families): your play in every family added up, day by day.
- Badges are earned and kept separately for each of those, by the same rules. A badge earned for a family and for
  "all families" at once pops up once.
- Local play's stats stay on the device; family stats are kept with your account (on every device you sign in on).

## Installable App

- The game can be added to a phone's home screen and works offline. When a new version is deployed, it offers
  "Update available — Reload".

## Open Questions

- Should there be an option to "Hide others' words until I find them" (showing only counts, and revealing a word with
  "Mom found that already" when you enter it)? It was in the original plan; not built yet (see todo.md).
