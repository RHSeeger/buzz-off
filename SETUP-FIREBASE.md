# Setting up Firebase for family play

Family play keeps each family's game in a free Firebase project that you own. Local play ("Just me") doesn't need any
of this. Until it's set up, the game just doesn't offer family play.

You'll need a Google account. It takes about 15 minutes. The Firebase console changes its layout from time to time,
so a button may have moved, but the steps stay the same.

## What it costs

Nothing. Use the free **Spark** plan, which needs no credit card. Its limits (1 GB stored, 10 GB downloaded a month,
100 people connected at once) are far more than a few families use: a year of daily play is a few megabytes. If a
limit were ever reached, the database would stop answering until the next month; it can't charge you. Don't upgrade
to the paid "Blaze" plan. If you ever do, set a budget alert first (Google Cloud console → Billing → Budgets & alerts).

## 1. Create the project

1. Go to https://console.firebase.google.com and sign in.
2. **Create a project** (or "Add project"). Name it something like `buzz-off`.
3. When it asks about **Google Analytics**, turn it off; the game doesn't use it.
4. Wait for it to finish, then **Continue**.

## 2. Create the database

1. In the left menu: **Build → Realtime Database** (not "Firestore"). Click **Create database**.
2. Pick a location near you.
3. Choose **Start in locked mode**, then **Enable**.
4. At the top of the Data tab is the database's address, such as
   `https://buzz-off-1234-default-rtdb.firebaseio.com` (or one ending in `firebasedatabase.app`). Keep it for step 4.

## 3. Add the security rules

The rules decide who can read and write what. For example, only a family's members can see its game, and you can only
join with the current invite code. They are what protects the data.

1. Still in Realtime Database, open the **Rules** tab.
2. Delete everything in the editor, and paste in the whole of `database.rules.json` from this project.
3. Click **Publish**.

Whenever `database.rules.json` changes, publish it again the same way.

## 4. Register the game as a web app

1. Go to **Project settings** (the gear next to "Project Overview"), and scroll to **Your apps**.
2. Click the **Web** button (`</>`). Give it a nickname such as `Buzz Off`. Leave "Firebase Hosting" **unchecked**:
   the game is hosted on GitHub Pages. Click **Register app**.
3. It shows a `firebaseConfig` with values like `apiKey`, `authDomain` and so on. Copy them into
   `src/typescript/data/firebaseConfig.ts`:

   ```ts
   export const FIREBASE_CONFIG = {
       apiKey: 'AIza...',
       authDomain: 'buzz-off-1234.firebaseapp.com',
       databaseURL: 'https://buzz-off-1234-default-rtdb.firebaseio.com', // from step 2 if it isn't shown here
       projectId: 'buzz-off-1234',
       appId: '1:1234567890:web:abc123',
   };
   ```

These values are **public by design**: they only say which project to talk to, and anyone who opens the game can see
them. That's fine. The security rules are what keep the data safe, so it's safe to commit this file.

## 5. Turn on sign-in

Players start as a **guest** (anonymous sign-in, no account needed), and can sign in with **Google** to use their
families on other devices.

1. In the left menu: **Build → Authentication → Get started**.
2. On the **Sign-in method** tab:
   - Click **Anonymous**, turn it on, and **Save**.
   - Click **Google**, turn it on, pick a support email (yours), and **Save**.
3. On the **Settings** tab, under **Authorized domains**, click **Add domain** and add your GitHub Pages domain,
   e.g. `yourname.github.io` (without `https://` or the repo name). `localhost` is already there, for `npm start`.

Google sign-in only works on authorized domains. For testing on a phone, use the GitHub Pages site. (Playing as a
guest also works at your computer's network address, from `npm start`.)

## 6. Check the rules

From the project folder:

```sh
npm run check:rules
```

It signs in a few throwaway guests and tries things that should and shouldn't be allowed: reading another family,
joining with a wrong code, overwriting someone's word, and so on. It prints `PASS` or `FAIL` for each, then deletes its
test family and guests. Everything should be `PASS`. If something fails, check that step 3 was published, and that
anonymous sign-in (step 5) is on.

## 7. Deploy and play

Build and deploy as usual: push to `main`, and the GitHub Actions workflow publishes `dist/`. Then, in the game:

1. Tap **Just me** (above the score), then **Create a family**. Give it a name, and your name and color.
2. Tap **Share link**, and send the link to the family. Opening it takes them to the game's Join screen.

## Optional: turn on the NYT puzzle for your family

The NYT puzzle import is only available to families you turn it on for, by hand:

1. In Realtime Database's **Data** tab, open `families`. Find your family: each key is a family id; open it, and its
   `meta` shows the name. Copy the id (something like `-Nx3abc...`).
2. Hover over the top line (the database's address) and click **+**. Add the key `admin`, then under it the key
   `nytFamilies`, and under that the key `<your family id>` with the value `true`. (Make sure it's the boolean `true`,
   not the text `"true"`.)
3. Reopen the game. The welcome screen now offers "Load today's NYT puzzle" for that family.

Nobody can turn this on from the game; the rules stop it.

## Looking after it

- **Backups:** the free plan has no automatic backups. To keep a copy, open the **Data** tab, use the ⋮ menu, and
  choose **Export JSON**.
- **A family member left, or a guest's device was lost:** the family's creator can remove members from the family
  screen (tap the family's name above the score, then "Family members & invite link").
- **An invite link got shared too widely:** the creator can make a new link. The old one stops working, but people
  already in the family stay in.
- **GitHub says it found a secret ("Google API Key" in `firebaseConfig.ts`):** that's the Firebase web API key from
  step 4. It's public by design (every player's browser downloads it), so it doesn't need replacing. Close the alert
  (the repository's Security → Secret scanning → the alert → Close as → False positive), with a note such as
  "Firebase web API key, public by design".
- **Recommended: limit what the API key can be used for.** In the Google Cloud console
  (https://console.cloud.google.com/apis/credentials, signed in as the project's account), open
  **Browser key (auto created by Firebase)**. Under **API restrictions**, choose **Restrict key**, tick
  **Identity Toolkit API** and **Token Service API** (signing in, and renewing the sign-in), and **Save**. That's all
  the game needs: the database doesn't use the key (it checks the player's sign-in instead). Then run
  `npm run check:rules`, and try Google sign-in in a private window. If anything stops working, set it back to
  **Don't restrict key**.
- **Not recommended: website restrictions** (limiting the key to your GitHub Pages site and `localhost`).
  `npm run check:rules` runs outside a browser, so it would stop working until you lifted the restriction.
