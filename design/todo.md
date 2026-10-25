# To Do

Known work that still needs doing: fixes, cleanup, follow-ups, and planned features that haven't been designed or
built yet. Once a feature is designed, its description belongs in `game-design.md`; this list only tracks that it
still needs doing.

- Add an item when something is found that needs fixing but isn't being fixed right away.
- Remove an item when it's done (git history keeps the record). If finishing it involved a design decision, record that
  in `decisions.md`.

---

# Planned features

## Family mode (Firebase)
From the original plan (phase 2), not started:
- Firebase init with the web config in `data/app.ts`; Google sign-in with `signInWithPopup` (not redirect).
- Create a family; invite by link (`#join=<fid>:<code>`); join with a display name and color; family switcher.
- Shared found words in Realtime Database, each credited to whoever found it first, with live updates; the progress
  bar split by player color; per-player stats; "Already found (by Mom)".
- Families have their own timezone for the day boundary.
- Security rules, with emulator tests; `SETUP-FIREBASE.md` for setting up the project.
- Option: "Hide others' words until I find them".
- NYT import for families: only for families enabled by hand (`admin/nytFamilies/<fid>`), with a choice screen and
  "Mom is loading the NYT puzzle" while someone is fetching it.

## NYT import
- **Check the bookmarklet against the real NYT page.** Open the puzzle in a desktop browser and run
  `JSON.stringify(Object.keys(window.gameData.today))` in the console; adjust the bookmarklet if the names differ.

## Testing on phones
- Test sign-in-free play, adding to the home screen, offline play and the update toast on an iPhone and an Android
  phone.
