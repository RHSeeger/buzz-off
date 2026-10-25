# How the Game Works

A plain-language explanation for people reading the source. (Players get the in-game How to Play screen instead.)

## Where the puzzle comes from

There's no server. The whole game is files on GitHub Pages. Two of those files do the heavy lifting:

- `data/words.txt` is every word that can be an answer, about 19,000 of them.
- `data/puzzles.txt` is the list of puzzles, one per line, like `labcnor`: the first letter (`l`) is the center, the
  other six go around it.

Each day plays the next line of `puzzles.txt`, counting from January 1, 2026. Because every device counts the same
way, everyone gets the same puzzle without anything being downloaded or stored per day.

To find the answers, the game goes through the word list and keeps every word that uses only the puzzle's letters and
includes the center letter. Each word's letters are stored as a 26-bit number (one bit per letter), so "does this word
use only these letters" is a single quick check, and the whole list takes a few milliseconds.

The word list and puzzle list are made by `tools/build-wordlist.ts` from SCOWL, an open word list. It drops words that
are capitalized, have punctuation or accents, contain an S, use more than 7 different letters, or are on the blocklist.
Then it finds every set of 7 letters that some word uses all of, tries each letter as the center, keeps the
combinations that have a reasonable number of answers, shuffles them in a fixed way, and keeps one center per letter
set.

## Playing

When a word is entered, the game checks it in order: long enough? only puzzle letters? includes the center? already
found? in the answer list? The first check that fails is the message shown.

Found words are saved on the device straight away, with the time they were found (some badges care about timing).
The score and rank are always worked out again from the words found, never stored.

## Stats and badges

For each day played, a short summary (score, words, pangrams, rank, longest word, ...) is kept. All the all-time
numbers, such as streaks, are added up from those summaries when needed.

After every word, the game checks the badges. Milestone badges look at the all-time numbers. Achievements look at
today's words: for example, Quick Buzz looks for any 5 words found within 60 seconds of each other.

## The NYT puzzle

The NYT page has the day's puzzle, answers included, in the page itself. The bookmarklet is a bookmark that runs a
little code on that page: it reads the puzzle and opens this game with the puzzle in the part of the address after
`#`, which browsers never send to a server. The game reads it, removes it from the address, checks it makes sense, and
plays it instead of the generated puzzle. That's only allowed until the first word of the day is found.

## Working offline

A service worker keeps a copy of the game's files. After the first visit, the game opens without a connection. Each
new build gets a new copy, and the game offers to reload when one is ready.
