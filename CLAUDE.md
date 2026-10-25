# AGENTS.md

## Your Role
You are an expert developer
- You are fluent in front end technologies; including Typescript, HTML, and CSS.
- You are to create Typescript, HTML, and CSS as appropriate for the project

## Project Overview

Buzz Off is a daily word puzzle built with **TypeScript** (strict mode), **HTML**, and **CSS**: find words made from 7
letters, each containing the center letter. It has ranks, hints, stats, streaks and badges, works offline as an
installable web app, and can optionally load the day's NYT puzzle through a bookmarklet. Players can play on their own
(saved in the browser) or with a family (a shared game, saved in Firebase Realtime Database; see SETUP-FIREBASE.md).

## Technologies Used

- **TypeScript** (strict mode enabled)
- **HTML5**
- **CSS3**
- **Webpack** for bundling assets
- **Firebase** (the `firebase` npm package: Auth and Realtime Database) for family play; the game's only runtime
  dependency, loaded only when family play is used
- **Node** for the build tools (word list, icons, rules check) and tests only


## Project Structure
- `/src` - Main application code
  - `/src/static` - Files copied to the build unchanged (word lists, icons, web app manifest)
- `/tests` - Test files
- `/tools` - Build tools (word list, icons), run with Node
- `/dist` - Where the build system places compiled and generated code
- `/node_modules` - Where node downloaded packages are placed

## Commands you can use
- Build Project: `npm run build`
- Run the game locally: `npm start` (http://localhost:3000)
- Run Tests: `npm run test`
- Check Style: `npm run lint` (checks only; does not change files)
- Fix Style: `npm run lint:fix` (automatically fixes what it can)
- Rebuild the word and puzzle lists: `npm run build:words` (changes answers; see design/decisions.md first)
- Rebuild the icons: `npm run build:icons`
- Check the Firebase security rules against the real project: `npm run check:rules` (needs the Firebase config filled in)

## Code Style Instructions
- Use TypeScript strict mode
- Prefer functional style code
- Prefer clarity over cleverness
- Keep solutions maintainable and readable
- Prefer putting each Typescript type/interface definition in it's own file (named after the type/interface)
- Typescipt files must have content in the order of
  - `import` statements
  - A comment in TSDoc format describing the file, what the code in it is and what it is for
  - Any static variables used in the file
  - The `type` or `interface` definition, if there is one in that file
  - Any other functions defined in that file
- Typescript files must have no more than a single type definition
- When adding or updating a Typescript fuction, add/update an explanation of the function in TSDoc format, directly preceeding the function that is being explained
- For Typescript, use an indent size of 4 spaces
- Typescript files should have a comment at the top explaining their purpose.

### Code Style Files/Formats
- Code Tools: `eslint` and `prettier`
- Code Files: Code style check output is written to `eslint-results.json`
  - The file is in JSON format

### Running Code Style Checks
- After making any code changes, always run a full style check using the specified Check Style command
- Always ensure the style check passes after all intended changes are complete


## Automated Testing Instructions

### Testing Files/Formats
- Test files are in `/tests/`, named `*.test.ts`
- Tests are written to `jest-results.json`
  - The file is in JSON format; failed tests are in `testResults[].assertionResults[]` with status "failed"

### Adding and Running Tests
- When adding new code or refactoring, always add or update automated unit tests for the affected functions or modules.
- Place new or updated tests in the tests directory, following the naming convention *.test.ts and mirroring the source file structure when possible.
- After making any code changes, always run the full test suite using the specified test command to ensure:
  - All new tests pass.
  - No pre-existing tests are broken by the change (unless explicitly allowed, see below).

### Handling Expected Test Failures

- If a code change intentionally breaks a pre-existing test (e.g., due to a requirements change), do NOT simply remove or skip the test.
- Instead, update the test to reflect the new expected behavior, and document the reason for the change in the test file as a comment.
- If a test must temporarily fail (e.g., for staged rollouts), clearly comment in the test file why the failure is expected and when it should be fixed.
- Always ensure the test suite passes after all intended changes and test updates are complete.


## Boundaries

### Always Allowed
- Read files in project
- Creating files in `/src/**`
- Updating files in `/src/**`
- Building project
- Running tests

### Ask first
- Installing packages
- Deleting files
- Anything that adds a service, or could cost money
- Changing `database.rules.json` (it protects the families' data; run `npm run check:rules` after publishing a change)

### Never
- Interacting with git / github (I want to do with manually for now)
- Committing, fetching or sharing NYT puzzle data (the NYT import is a manual, per-player step; see design/game-design.md)

### Design

- See @design/code-design.md - the way the code is layed out in the directory, what code can do what, etc
- See @design/game-design.md - information about the design of the game itself - what the different features are, how the interact, etc
- See @design/decisions.md - a dated log of design/architecture decisions: what was decided, when, and why
- See `design/how-the-game-works.md` - plain-language explanation of how the game works, for people reading the
  source; update it when a feature players would notice changes. The in-game How to Play screen
  (`src/typescript/ui/help.ts`) is written separately for players; check it too (the two are not copies of each other)
- See @design/todo.md - known work that still needs doing: fixes, cleanup, follow-ups, and planned features

### Recording Decisions
- When a design or architecture decision is made (or an existing one changes), update the relevant file in `design/`
  and add an entry to `design/decisions.md`, following the format described at the top of that file
- Mark older entries that a new decision replaces as superseded; never delete entries
- Unresolved questions go in the "Open Questions" section of the relevant design file
- Known work that isn't being done right away (bugs, cleanup, follow-ups) goes in `design/todo.md`; remove items when
  they are done
