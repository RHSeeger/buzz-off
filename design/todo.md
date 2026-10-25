# To Do

Known work that still needs doing: fixes, cleanup, follow-ups, and planned features that haven't been designed or
built yet. Once a feature is designed, its description belongs in `game-design.md`; this list only tracks that it
still needs doing.

- Add an item when something is found that needs fixing but isn't being fixed right away.
- Remove an item when it's done (git history keeps the record). If finishing it involved a design decision, record that
  in `decisions.md`.

---

# Setup

- **Try family play end to end** against the real Firebase project (`buzz-off-c4a4d`; set up 2026-10-25, all 34
  rules checks pass): create, invite, join on a second device, switch back and forth, sign in with Google, the NYT
  import for a family.

# Planned features

## Family play
- **Stale guest members:** when a guest signs in with a Google account that already had its own data, the guest's old
  member record stays in each family (shown as a second "you"). The family's creator can remove it; the game could do
  it automatically before switching accounts.

## Testing on phones
- Test sign-in-free play, adding to the home screen, offline play and the update toast on an iPhone and an Android
  phone.
- Test Google sign-in inside the home-screen app on iOS (its storage is separate from Safari's; the popup may not
  work there). If it fails, the game says to use the browser instead; check that message makes sense.
- Try the NYT bookmarklet end to end on an iPhone and an Android phone (the page's field names are confirmed, but the
  whole flow hasn't been run on a phone yet).
