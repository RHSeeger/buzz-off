import { APP_NAME } from './data/app';
import { ALL_FAMILIES, PLAYER_COLORS } from './data/family';
import { FAMILY_PLAY_AVAILABLE } from './data/firebaseConfig';
import { evaluateAchievements } from './gamelogic/achievements';
import { currentGameUrl } from './gamelogic/bookmarklet';
import { addDays, dayKey, localTimeZone } from './gamelogic/dates';
import { puzzleForDay } from './gamelogic/day';
import { playerDayState, teamDayState, viewForDay } from './gamelogic/familyDay';
import { formatInviteLink, parseInviteLink } from './gamelogic/invites';
import { combineHistories } from './gamelogic/personal';
import { lifetimeStats, summarizeDay } from './gamelogic/stats';
import { getJSON, setJSON } from './gamelogic/storage';
import { findersOf, othersHidden, rank, session, shownRank } from './session';
import type { DaySummary } from './types/DaySummary';
import type { EarnedBadge } from './types/EarnedBadge';
import type { FamilyDayData } from './types/FamilyDayData';
import type { FamilyHooks } from './types/FamilyHooks';
import type { FamilyView } from './types/FamilyView';
import type { ImportedPuzzle } from './types/ImportedPuzzle';
import type { InviteLink } from './types/InviteLink';
import type { PersonalData } from './types/PersonalData';
import type { PlayerProfile } from './types/PlayerProfile';
import { showCreateFamily, showFamilyInfo, showJoinFamily, showPlayMode } from './ui/familyScreens';
import { closeModal } from './ui/modal';
import { showToast } from './ui/toast';
import { showYesterday } from './ui/yesterday';

/**
 * Family play: switching between local and family play, connecting to a family and following its day live, adding
 * words, creating and joining families, signing in, and keeping the player's family history and badges (in Firebase)
 * up to date. Firebase itself is in family/, loaded the first time family play is used.
 */

/** The Firebase functions (family/api.ts), once loaded */
let api: typeof import('./family/api') | null = null;

/** What the game does for family play (set by initFamily()) */
let hooks: FamilyHooks;

/** Stops watching the family's name and members */
let stopFamily: (() => void) | null = null;

/** Stops watching the family's day */
let stopDay: (() => void) | null = null;

/** Stops watching the player's own data */
let stopPersonal: (() => void) | null = null;

/** Whose data is being watched */
let personalUid: string | null = null;

/** Whether the connection is being watched */
let watchingConnection = false;

/** Show the welcome screen when the family's day first arrives */
let splashOnFirstData = false;

/** The rank shown when the family's day last changed (-1 until the day arrives), to spot rank-ups */
let lastShownRank = -1;

/** Waiting for the family's name and members to arrive */
let readyCallbacks: (() => void)[] = [];

/**
 * Sets up family play.
 *
 * @param h - What the game does for family play
 */
export function initFamily(h: FamilyHooks): void {
    hooks = h;
}

/**
 * Loads the Firebase functions the first time they're needed.
 *
 * @returns The functions
 */
async function loadApi(): Promise<typeof import('./family/api')> {
    if (!api) api = await import('./family/api');
    return api;
}

/**
 * Returns the name and color the player last used, or a default.
 *
 * @returns The profile
 */
function savedProfile(): PlayerProfile {
    return getJSON<PlayerProfile>('profile', { name: '', color: PLAYER_COLORS[0].id });
}

/**
 * Remembers the player's name and color, and an invite code they used (so a guest's families can be moved to a
 * Google account later).
 *
 * @param me - The name and color
 * @param link - The family and code
 */
function remember(me: PlayerProfile, link: InviteLink): void {
    setJSON('profile', me);
    setJSON('inviteCodes', { ...getJSON<Record<string, string>>('inviteCodes', {}), [link.fid]: link.code });
    setJSON('usedFamily', true);
}

/**
 * Loads which of a family's words the player sees on a day, from the device.
 *
 * @param fid - The family
 * @param key - The day key
 * @returns The view (a new one, showing only the player's words, if none is saved for that day)
 */
function loadView(fid: string, key: string): FamilyView {
    return viewForDay(getJSON<Record<string, FamilyView>>('familyView', {})[fid], key);
}

/**
 * Saves which of the family's words the player sees today (only the latest day is kept for each family).
 *
 * @param fid - The family
 * @param view - The view
 */
function saveView(fid: string, view: FamilyView): void {
    setJSON('familyView', { ...getJSON<Record<string, FamilyView>>('familyView', {}), [fid]: view });
}

/**
 * Starts watching the player's own data (families, family history, badges), and waits for it to arrive.
 *
 * @param uid - The player
 */
async function watchPersonalData(uid: string): Promise<void> {
    if (personalUid === uid && session.personalLoaded) return;
    const a = await loadApi();
    stopPersonal?.();
    personalUid = uid;
    session.personalLoaded = false;
    await new Promise<void>((resolve) => {
        stopPersonal = a.watchPersonal(uid, (data) => {
            session.personal = data;
            session.personalLoaded = true;
            hooks.render();
            resolve();
        });
    });
}

/**
 * Connects to the player's account if they have used family play on this device before, so their families can be
 * listed. Players who only play locally never load Firebase.
 */
async function connectAccount(): Promise<void> {
    if (!FAMILY_PLAY_AVAILABLE || (!getJSON('usedFamily', false) && !session.user)) return;
    const a = await loadApi();
    session.user = await a.currentUser();
    if (session.user) await watchPersonalData(session.user.uid);
}

/**
 * Stops following the family (its members and day).
 */
function stopWatchingFamily(): void {
    stopFamily?.();
    stopDay?.();
    stopFamily = null;
    stopDay = null;
    readyCallbacks = [];
}

/**
 * Switches to local play.
 *
 * @param message - A message to show, if any
 */
export function switchToLocal(message?: string): void {
    stopWatchingFamily();
    session.family = null;
    session.mode = { kind: 'local' };
    setJSON('mode', session.mode);
    hooks.openLocal();
    hooks.showReady();
    if (message) showToast(message);
}

/**
 * Handles the family disappearing (the player was removed, or it was deleted): takes it off their list and switches
 * to local play.
 *
 * @param fid - The family
 */
function familyGone(fid: string): void {
    if (session.family?.fid !== fid) return;
    const name = session.family.meta?.name ?? 'that family';
    if (session.user) void api?.forgetFamily(session.user.uid, fid).catch(() => {});
    switchToLocal(`You're no longer in ${name}, so you're playing on your own.`);
}

/**
 * Switches to playing with a family: connects, and follows its members and day live.
 *
 * @param fid - The family
 * @param options - Whether to show the welcome screen once the day arrives
 */
export async function enterFamily(fid: string, options: { splash: boolean }): Promise<void> {
    stopWatchingFamily();
    session.mode = { kind: 'family', fid };
    setJSON('mode', session.mode);
    setJSON('usedFamily', true);
    session.family = { fid, meta: null, members: {}, nytEnabled: false, data: null, view: loadView(fid, '') };
    const listed = session.personal.families.find((f) => f.fid === fid)?.name;
    hooks.showConnecting(`Connecting to ${listed ?? 'your family'}…`);
    splashOnFirstData = options.splash;
    let a: typeof import('./family/api');
    try {
        a = await loadApi();
        session.user = await a.ensureUser();
        await watchPersonalData(session.user.uid);
    } catch {
        hooks.showConnecting("Couldn't connect to your family. Check your connection, or play on your own for now.");
        return;
    }
    if (session.family?.fid !== fid) return;
    if (!watchingConnection) {
        watchingConnection = true;
        a.watchConnected((online) => {
            session.online = online;
            hooks.render();
        });
    }
    void a.isNytEnabled(fid).then((on) => {
        if (session.family?.fid !== fid) return;
        session.family.nytEnabled = on;
        hooks.render();
    });
    stopFamily = a.watchFamily(
        fid,
        (meta, members) => {
            const fam = session.family;
            if (fam?.fid !== fid) return;
            fam.meta = meta;
            fam.members = members;
            const key = dayKey(new Date(), meta.timezone);
            if (key !== session.todayKey || !stopDay) openFamilyDay(key);
            else hooks.render();
            const waiting = readyCallbacks;
            readyCallbacks = [];
            waiting.forEach((cb) => cb());
        },
        () => familyGone(fid),
    );
}

/**
 * Returns today's date key in the family's timezone.
 *
 * @returns The day key (or the device's date, if the family's settings haven't arrived)
 */
export function familyDayKey(): string {
    return dayKey(new Date(), session.family?.meta?.timezone);
}

/**
 * Starts following one of the family's days.
 *
 * @param key - The day key
 * @param splash - Show the welcome screen when it arrives
 */
export function openFamilyDay(key: string, splash = false): void {
    const fam = session.family;
    if (!fam || !api) return;
    stopDay?.();
    session.todayKey = key;
    fam.data = null;
    fam.view = loadView(fam.fid, key);
    lastShownRank = -1;
    if (splash) splashOnFirstData = true;
    const fid = fam.fid;
    stopDay = api.watchFamilyDay(
        fid,
        key,
        (data) => applyFamilyDay(fid, key, data),
        () => familyGone(fid),
    );
}

/**
 * Takes in a new version of the family's day: works out the puzzle, the family's and the player's words, redraws,
 * celebrates rank-ups, and records the player's progress.
 *
 * @param fid - The family
 * @param key - The day key
 * @param data - The day's data
 */
function applyFamilyDay(fid: string, key: string, data: FamilyDayData): void {
    const fam = session.family;
    const user = session.user;
    if (!fam || fam.fid !== fid || session.todayKey !== key || !user) return;
    const first = fam.data === null;
    const before = session.puzzle;
    fam.data = data;
    const team = teamDayState(key, data);
    const puzzle = puzzleForDay(team, session.wordlist, session.puzzleLines);
    session.day = team;
    session.myDay = playerDayState(team, data, user.uid, puzzle);
    session.puzzle = puzzle;
    session.found = new Set(team.found.map((f) => f.w));
    const lettersChanged = !before || before.center + before.outer.join('') !== puzzle.center + puzzle.outer.join('');
    if (first || lettersChanged) hooks.dayChanged();
    else hooks.render(team.found[team.found.length - 1]?.w);
    if (first) {
        hooks.showReady();
        if (splashOnFirstData) {
            splashOnFirstData = false;
            hooks.openSplash();
        }
        if (session.pendingImport) {
            const text = session.pendingImport;
            session.pendingImport = null;
            hooks.importPuzzle(text);
        }
    }
    // While others' words are hidden, the rank shown (and celebrated) is the player's own
    const r = shownRank();
    if (!first && lastShownRank >= 0 && r > lastShownRank) hooks.celebrate(r);
    lastShownRank = r;
    recordFamilyProgress();
}

/**
 * Shows every word the family found today, or only the player's own again. The rank shown changes without a
 * celebration.
 *
 * @param on - True to show everyone's words
 */
export function showEveryonesWords(on: boolean): void {
    const fam = session.family;
    if (!fam) return;
    fam.view = { ...fam.view, showAll: on };
    saveView(fam.fid, fam.view);
    if (fam.data) lastShownRank = shownRank();
    hooks.render();
}

/**
 * Shows a word someone else found, after the player entered it (while others' words are hidden). It doesn't count
 * for the player.
 *
 * @param word - The word
 */
export function revealWord(word: string): void {
    const fam = session.family;
    if (!fam || !othersHidden() || fam.view.seen.includes(word)) return;
    fam.view = { ...fam.view, seen: [...fam.view.seen, word] };
    saveView(fam.fid, fam.view);
    hooks.render(word);
}

/**
 * Returns the player's summary for today in the family: their own words, with the family's rank.
 *
 * @returns The summary
 */
export function myFamilySummary(): DaySummary {
    return { ...summarizeDay(session.myDay, session.puzzle), rank: rank() };
}

/**
 * Returns the player's history in one family, with today's summary up to date.
 *
 * @param fid - The family
 * @returns The history
 */
export function familyHistory(fid: string): Record<string, DaySummary> {
    const h = { ...(session.personal.history[fid] ?? {}) };
    if (session.family?.fid === fid && session.myDay?.found.length) h[session.todayKey] = myFamilySummary();
    return h;
}

/**
 * Returns the player's history in all their families together.
 *
 * @returns The combined history
 */
export function allFamiliesHistory(): Record<string, DaySummary> {
    const fids = new Set([...Object.keys(session.personal.history), ...(session.family ? [session.family.fid] : [])]);
    return combineHistories([...fids].map((fid) => familyHistory(fid)));
}

/**
 * Saves the player's summary for today (when it changed), and checks for badges in this family and in all families.
 *
 * @param event - Something the player just did that a badge is for (e.g. 'yesterday')
 */
export function recordFamilyProgress(event?: string): void {
    const fam = session.family;
    const user = session.user;
    if (!fam || !user || !api || !session.personalLoaded || !fam.data) return;
    const a = api;
    const key = session.todayKey;
    if (session.myDay.found.length > 0) {
        const summary = myFamilySummary();
        const saved = session.personal.history[fam.fid]?.[key];
        if (JSON.stringify(saved) !== JSON.stringify(summary)) {
            session.personal.history[fam.fid] = { ...(session.personal.history[fam.fid] ?? {}), [key]: summary };
            void a.saveFamilySummary(user.uid, fam.fid, key, summary).catch(() => {});
        }
    }
    const earned: { badge: EarnedBadge; where: string }[] = [];
    const familyLabel = fam.meta?.name ?? 'your family';
    for (const [scope, history, where] of [
        [fam.fid, familyHistory(fam.fid), `with ${familyLabel}`],
        [ALL_FAMILIES, allFamiliesHistory(), 'across your families'],
    ] as const) {
        const unlocked = { ...(session.personal.achievements[scope] ?? {}) };
        const fresh = evaluateAchievements(
            {
                stats: lifetimeStats(history, key),
                history,
                todayKey: key,
                day: session.myDay,
                puzzle: session.puzzle,
                rank: rank(),
                event,
            },
            unlocked,
        );
        if (!fresh.length) continue;
        session.personal.achievements[scope] = unlocked;
        void a.saveFamilyAchievements(user.uid, scope, unlocked).catch(() => {});
        for (const badge of fresh) earned.push({ badge, where });
    }
    if (earned.length) hooks.announceBadges(earned);
}

/**
 * Records a word the player found in the family's game. The screen updates as soon as the word is saved locally;
 * if someone else found it first, the player is told.
 *
 * @param word - The word (already checked)
 */
export function addFamilyWord(word: string): void {
    const fam = session.family;
    const user = session.user;
    if (!fam || !user || !api) return;
    const firstOfDay = !session.day.source && session.day.found.length === 0;
    api.addFamilyWord(fam.fid, session.todayKey, word, user.uid, firstOfDay).catch(() => {
        const by = fam.data?.found.find((f) => f.w === word)?.by;
        const name = by && by !== user.uid ? fam.members[by]?.name : null;
        hooks.flash(name ? `${name} found that just before you` : "Couldn't save that word. Check your connection.");
        if (name) revealWord(word);
    });
}

/**
 * Records that the player opened the hints in the family's game.
 */
export function markFamilyHints(): void {
    const fam = session.family;
    if (fam && session.user && api) void api.markFamilyHints(fam.fid, session.todayKey, session.user.uid);
}

/**
 * Switches the family's day to the generated puzzle (only before the first word).
 */
export function useGeneratedInFamily(): void {
    const fam = session.family;
    if (fam && api) {
        void api
            .setFamilySource(fam.fid, session.todayKey, 'generated', fam.nytEnabled)
            .catch(() => showToast("Couldn't change the puzzle."));
    }
}

/**
 * Loads an imported NYT puzzle as the family's puzzle for today (already checked by the game). If the day hasn't
 * arrived yet, it is loaded once it does.
 *
 * @param text - The payload text, kept in case the day hasn't arrived
 * @param puzzle - The checked puzzle
 * @returns A message saying why it can't be loaded, or null if it is being loaded
 */
export function importIntoFamily(text: string, puzzle: ImportedPuzzle): string | null {
    const fam = session.family;
    if (!fam || !session.user || !api) return "You're not connected to your family yet.";
    if (!fam.data) {
        session.pendingImport = text;
        return null;
    }
    if (!fam.nytEnabled) {
        return "The NYT puzzle import isn't turned on for this family (see SETUP-FIREBASE.md), so it wasn't loaded.";
    }
    api.saveFamilyNyt(fam.fid, session.todayKey, puzzle, session.user.uid)
        .then(() => showToast("Today's NYT puzzle is loaded for the whole family. Have fun!"))
        .catch(() => showToast("Couldn't load the puzzle for the family. Someone may have just found a word."));
    return null;
}

/**
 * Works out the choice of puzzle to offer on the welcome screen, for a family with the NYT import, before anything is
 * found: ours or the NYT's, or waiting for someone who is getting the NYT one.
 *
 * @returns The choice, or null if there isn't one to make
 */
export function familyNytChoice():
    | { kind: 'choose'; onGenerated: () => void; onNyt: () => void }
    | { kind: 'pending'; byName: string; at: number; onGenerated: () => void }
    | null {
    const fam = session.family;
    const user = session.user;
    if (!fam?.nytEnabled || !fam.data || !user || !api) return null;
    if (session.day.source || session.day.found.length) return null;
    const a = api;
    const pending = fam.data.pendingNyt;
    if (pending && pending.by !== user.uid) {
        return {
            kind: 'pending',
            byName: fam.members[pending.by]?.name ?? 'Someone',
            at: pending.at,
            onGenerated: useGeneratedInFamily,
        };
    }
    return {
        kind: 'choose',
        onGenerated: useGeneratedInFamily,
        onNyt: () => {
            void a.setPendingNyt(fam.fid, session.todayKey, user.uid).catch(() => {});
            hooks.showNytImport();
        },
    };
}

/**
 * Opens yesterday's answers for the family, with who found each word.
 */
export async function openFamilyYesterday(): Promise<void> {
    const fam = session.family;
    if (!fam || !api) return;
    const key = addDays(session.todayKey, -1);
    try {
        const team = teamDayState(key, await api.readFamilyDay(fam.fid, key));
        showYesterday(
            key,
            team,
            puzzleForDay(team, session.wordlist, session.puzzleLines),
            findersOf(team.found) ?? {},
        );
        recordFamilyProgress('yesterday');
    } catch {
        showToast("Couldn't load yesterday's answers.");
    }
}

/**
 * Shares an invite link: with the device's share sheet if it has one, otherwise by copying it.
 *
 * @param link - The link
 */
function shareLink(link: string): void {
    if (navigator.share) {
        navigator.share({ title: APP_NAME, text: `Join our family game of ${APP_NAME}!`, url: link }).catch(() => {});
        return;
    }
    navigator.clipboard
        .writeText(link)
        .then(() => showToast('Invite link copied.'))
        .catch(() => showToast('Copy the link from the box.'));
}

/**
 * Opens the family's screen (members, invite link, your name and color, leaving).
 */
export function openFamilyInfo(): void {
    const fam = session.family;
    const user = session.user;
    if (!fam || !user || !api) return;
    if (!fam.meta) {
        readyCallbacks.push(openFamilyInfo);
        return;
    }
    const a = api;
    const { fid } = fam;
    const linkFor = (code: string): string => formatInviteLink(currentGameUrl(), { fid, code });
    showFamilyInfo({
        meta: fam.meta,
        members: fam.members,
        myUid: user.uid,
        inviteLink: async () => linkFor(await a.readInviteCode(fid)),
        onShare: shareLink,
        onRegenerate: async () => linkFor(await a.regenerateInviteCode(fid)),
        onRemoveMember: (uid) => a.removeMember(fid, uid),
        onSaveProfile: async (me) => {
            try {
                await a.updateMyProfile(fid, user.uid, me);
                setJSON('profile', me);
            } catch {
                return "Couldn't save. Check your connection.";
            }
        },
        onLeave: () => {
            const name = fam.meta?.name ?? 'the family';
            closeModal();
            switchToLocal(`You left ${name}.`);
            void a.leaveFamily(user.uid, fid).catch(() => showToast("Couldn't leave the family. Try again."));
        },
        onDelete: () => {
            const name = fam.meta?.name ?? 'The family';
            closeModal();
            switchToLocal(`${name} was deleted.`);
            void a.deleteFamily(user.uid, fid).catch(() => showToast("Couldn't delete the family. Try again."));
        },
    });
}

/**
 * Opens the Create a Family screen; once created, switches to it and shows its invite link.
 */
function openCreateFamily(): void {
    showCreateFamily({
        profile: savedProfile(),
        onCreate: async (familyName, me) => {
            try {
                const a = await loadApi();
                const user = await a.ensureUser();
                session.user = user;
                await watchPersonalData(user.uid);
                const link = await a.createFamily(user.uid, familyName, me, localTimeZone() ?? 'UTC');
                remember(me, link);
                closeModal();
                await enterFamily(link.fid, { splash: false });
                showToast(`${familyName} is ready. Share the invite link to bring everyone in.`);
                openFamilyInfo();
            } catch {
                return "Couldn't create the family. Check your connection (and the Firebase setup).";
            }
        },
    });
}

/**
 * Opens the Join a Family screen for an invite link; once joined, switches to the family.
 *
 * @param link - The family and code
 */
export function openJoinFamily(link: InviteLink): void {
    if (!FAMILY_PLAY_AVAILABLE) {
        showToast("Family play isn't set up on this site yet, so the invite link can't be used.");
        return;
    }
    if (session.mode.kind === 'family' && session.mode.fid === link.fid) {
        showToast("You're already playing with this family.");
        return;
    }
    showJoinFamily({
        profile: savedProfile(),
        user: session.user,
        onJoin: async (me) => {
            let a: typeof import('./family/api');
            try {
                a = await loadApi();
                const user = await a.ensureUser();
                session.user = user;
                await watchPersonalData(user.uid);
            } catch {
                return "Couldn't connect. Check your connection and try again.";
            }
            try {
                await a.joinFamily(session.user.uid, link, me);
            } catch {
                return "This invite link doesn't work any more. Ask for a new one.";
            }
            remember(me, link);
            closeModal();
            await enterFamily(link.fid, { splash: true });
        },
        onSignInWithGoogle: signInWithGoogle,
    });
}

/**
 * Signs in with Google. A guest's families, history and badges come along; if the Google account was already used
 * with the game, the guest's data is merged into it, and the guest's families are rejoined where possible.
 *
 * @returns A message saying why it failed, or nothing on success
 */
async function signInWithGoogle(): Promise<string | void> {
    const a = await loadApi();
    const guestData: PersonalData | null = session.personalLoaded ? session.personal : null;
    let previousUid: string | null;
    try {
        const result = await a.signInWithGoogle();
        session.user = result.user;
        previousUid = result.previousUid;
    } catch (e) {
        return a.authErrorMessage(e);
    }
    const user = session.user;
    setJSON('usedFamily', true);
    personalUid = null;
    await watchPersonalData(user.uid);
    if (previousUid && guestData) {
        await a.mergePersonalData(user.uid, session.personal, guestData).catch(() => {});
        const codes = getJSON<Record<string, string>>('inviteCodes', {});
        const missing = guestData.families.filter((f) => !session.personal.families.some((g) => g.fid === f.fid));
        const failed: string[] = [];
        for (const f of missing) {
            const code = codes[f.fid];
            if (!code) {
                failed.push(f.name);
                continue;
            }
            await a
                .joinFamily(
                    user.uid,
                    { fid: f.fid, code },
                    savedProfile().name ? savedProfile() : { name: 'Me', color: 'red' },
                )
                .catch(() => failed.push(f.name));
        }
        if (failed.length) {
            showToast(`Ask for a new invite link to rejoin: ${failed.join(', ')}.`, { duration: 8000 });
        }
    }
    showToast(`Signed in${user.displayName ? ` as ${user.displayName}` : ''}.`);
    if (session.mode.kind === 'family') {
        const fid = session.mode.fid;
        if (session.personal.families.some((f) => f.fid === fid)) await enterFamily(fid, { splash: false });
        else switchToLocal();
    }
    hooks.render();
}

/**
 * Signs out of Google; switches to local play.
 */
async function signOut(): Promise<void> {
    const a = await loadApi();
    if (session.mode.kind === 'family') switchToLocal();
    stopPersonal?.();
    stopPersonal = null;
    personalUid = null;
    session.personal = { families: [], history: {}, achievements: {} };
    session.personalLoaded = false;
    await a.signOutUser().catch(() => {});
    session.user = null;
    setJSON('usedFamily', false);
    hooks.render();
    showToast('Signed out. Sign in again any time to get your families back.');
}

/**
 * Opens the "Who are you playing with?" screen.
 */
export async function openPlayMode(): Promise<void> {
    try {
        await Promise.race([connectAccount(), new Promise((resolve) => setTimeout(resolve, 5000))]);
    } catch {
        // Offline: show what's known
    }
    showPlayMode({
        available: FAMILY_PLAY_AVAILABLE,
        user: session.user,
        families: session.personal.families,
        mode: session.mode,
        onChoose: (mode) => {
            if (mode.kind === 'local') switchToLocal('Playing on your own.');
            else void enterFamily(mode.fid, { splash: true });
        },
        onFamilyInfo: () => openFamilyInfo(),
        onCreate: openCreateFamily,
        onJoinLink: (text) => {
            const link = parseInviteLink(text);
            if (!link) return false;
            closeModal();
            openJoinFamily(link);
            return true;
        },
        onSignInWithGoogle: signInWithGoogle,
        onSignOut: () => void signOut(),
    });
}
