import { APP_NAME, MAX_INPUT_LENGTH } from './data/app';
import { ALL_FAMILIES } from './data/family';
import { FAMILY_PLAY_AVAILABLE } from './data/firebaseConfig';
import { GENIUS_RANK, PERFECT_RANK, RANKS } from './data/ranks';
import {
    addFamilyWord,
    allFamiliesHistory,
    enterFamily,
    familyDayKey,
    familyHistory,
    familyNytChoice,
    importIntoFamily,
    initFamily,
    markFamilyHints,
    myFamilySummary,
    openFamilyDay,
    openFamilyYesterday,
    openJoinFamily,
    openPlayMode,
    switchToLocal,
    useGeneratedInFamily,
} from './familyController';
import { evaluateAchievements } from './gamelogic/achievements';
import { addDays, dayKey, formatLongDate } from './gamelogic/dates';
import { addFound, isLocked, loadDay, puzzleForDay, saveDay, setSource } from './gamelogic/day';
import { parseInviteLink } from './gamelogic/invites';
import { INVALID_MESSAGE, parsePayload, validatePayload } from './gamelogic/nytImport';
import { checkGuess, parsePuzzles } from './gamelogic/puzzle';
import { lifetimeStats, summarizeDay } from './gamelogic/stats';
import { getJSON, remove, setJSON } from './gamelogic/storage';
import { loadWordlist } from './gamelogic/wordlist';
import { familyName, findersOf, rank, score, session, teamShares } from './session';
import type { EarnedBadge } from './types/EarnedBadge';
import type { GuessError } from './types/GuessError';
import type { Hive } from './types/Hive';
import type { History } from './types/History';
import type { InviteLink } from './types/InviteLink';
import type { LifetimeStats } from './types/LifetimeStats';
import type { PlayMode } from './types/PlayMode';
import type { SettingsActions } from './types/SettingsActions';
import type { StatsScope } from './types/StatsScope';
import type { Theme } from './types/Theme';
import type { UnlockedAchievements } from './types/UnlockedAchievements';
import type { Wordbox } from './types/Wordbox';
import { h, icon, restartAnimation } from './ui/dom';
import { getElement } from './ui/getElement';
import { showHelp } from './ui/help';
import { showHints } from './ui/hints';
import { createHive } from './ui/hive';
import { closeModal, isModalOpen } from './ui/modal';
import { createWordbox, renderProgress } from './ui/progress';
import { showRankings } from './ui/rankings';
import { showNytImport, showSettings } from './ui/settings';
import { showCelebration, showSplash } from './ui/splash';
import { showStats } from './ui/statsView';
import { flashMessage, showToast } from './ui/toast';
import { showYesterday } from './ui/yesterday';

/**
 * The game: handles the player's input, keeps the screen up to date, and plays locally (saved on this device). Family
 * play is in familyController.ts; both share the state in session.ts. Started by startApp(), from index.ts.
 */

/** The messages shown for a rejected guess */
const ERRORS: Record<GuessError, string> = {
    short: 'Too short',
    center: 'Missing center letter',
    letters: 'Bad letters',
    unknown: 'Not in word list',
    found: 'Already found',
};

/** The honeycomb and found-words box, made by wireUi() */
let hive: Hive;
let wordbox: Wordbox;

/**
 * Returns whether the game is playing with a family.
 *
 * @returns True in family play
 */
function inFamily(): boolean {
    return session.mode.kind === 'family';
}

/**
 * Loads local play's history and badges, and the theme, from storage.
 */
function loadPersistent(): void {
    session.history = getJSON<History>('history', {}) ?? {};
    session.unlocked = getJSON<UnlockedAchievements>('achievements', {}) ?? {};
    session.theme = getJSON<Theme>('theme', 'auto') ?? 'auto';
}

/**
 * Updates today's entry in local play's history, and saves the history.
 */
function recordHistory(): void {
    if (session.day.found.length) session.history[session.todayKey] = summarizeDay(session.day, session.puzzle);
    else delete session.history[session.todayKey];
    setJSON('history', session.history);
}

/**
 * Works out local play's all-time stats.
 *
 * @returns The stats
 */
function localStats(): LifetimeStats {
    return lifetimeStats(session.history, dayKey());
}

/**
 * Returns the stats for the mode being played: local play's, or the player's in the current family.
 *
 * @returns The stats
 */
function currentStats(): LifetimeStats {
    if (session.mode.kind === 'family') return lifetimeStats(familyHistory(session.mode.fid), session.todayKey);
    return localStats();
}

/**
 * Switches to local play for a day: loads its play and puzzle, and redraws.
 *
 * @param key - The day key
 */
function openLocalDay(key: string): void {
    session.todayKey = key;
    session.day = loadDay(key);
    session.myDay = session.day;
    session.puzzle = puzzleForDay(session.day, session.wordlist, session.puzzleLines);
    session.found = new Set(session.day.found.map((f) => f.w));
    dayChanged();
}

/**
 * Shows the day's letters and date, and redraws (after the day or its puzzle changes).
 */
function dayChanged(): void {
    session.input = '';
    hive.setLetters(session.puzzle.center, session.puzzle.outer);
    getElement('date').textContent = formatLongDate(session.todayKey);
    renderAll();
}

/**
 * Draws the word being typed: the center letter highlighted, letters not in the puzzle greyed out.
 */
function renderInput(): void {
    const { center, letters } = session.puzzle;
    getElement('input-text').replaceChildren(
        ...[...session.input].map((ch) =>
            h('span', { class: ch === center ? 'center' : letters.includes(ch) ? '' : 'bad' }, ch.toUpperCase()),
        ),
    );
    const input = getElement('input');
    input.classList.toggle('empty', session.input.length === 0);
    input.setAttribute(
        'aria-label',
        session.input ? `Current word: ${session.input.toUpperCase().split('').join(' ')}` : 'Current word: empty',
    );
}

/**
 * Draws the button that says who the player is playing with.
 */
function renderModeChip(): void {
    const chip = getElement('mode-chip');
    const name = familyName();
    chip.replaceChildren(
        h('span', { 'aria-hidden': 'true' }, name ? '👪' : '🙋'),
        h('span', { class: 'mode-name' }, name ?? 'Just me'),
        icon('chevron'),
    );
    chip.classList.toggle('offline', inFamily() && !session.online);
    chip.setAttribute('aria-label', `Playing ${name ? `with ${name}` : 'on your own'}. Change who you play with.`);
}

/**
 * Redraws everything that changes during play.
 *
 * @param highlight - A word to flash in the found-words list (the one just found)
 */
function renderAll(highlight?: string): void {
    renderModeChip();
    if (!session.puzzle) return;
    const shares = teamShares().map((c) => ({ color: c.color, points: c.points }));
    renderProgress(getElement('progress'), score(), session.puzzle.maxScore, shares);
    wordbox.render(
        session.day.found.map((f) => f.w),
        session.puzzle,
        highlight,
        findersOf(session.day.found),
    );
    renderInput();
    getElement('source-badge').hidden = session.puzzle.source !== 'nyt';
}

/**
 * Applies the light/dark choice to the page.
 */
function applyTheme(): void {
    if (session.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = session.theme;
}

/**
 * Hides the play area and shows a message, with a button to play locally instead.
 *
 * @param text - The message
 */
function showConnecting(text: string): void {
    getElement('connecting-text').textContent = text;
    getElement('connecting').hidden = false;
    document.body.classList.add('connecting');
}

/**
 * Shows the play area again.
 */
function showReady(): void {
    getElement('connecting').hidden = true;
    document.body.classList.remove('connecting');
}

/**
 * Adds a letter to the word being typed.
 *
 * @param ch - The letter, lowercase
 */
function typeLetter(ch: string): void {
    if (session.input.length >= MAX_INPUT_LENGTH) return;
    session.input += ch;
    hive.flash(ch);
    renderInput();
}

/**
 * Removes the last letter of the word being typed.
 */
function backspace(): void {
    session.input = session.input.slice(0, -1);
    renderInput();
}

/**
 * Shows why a guess was rejected, shakes it, then clears it.
 *
 * @param text - The message
 */
function rejectInput(text: string): void {
    flashMessage(text, 'error');
    const el = getElement('input');
    restartAnimation(el, 'shake');
    setTimeout(() => {
        session.input = '';
        renderInput();
        el.classList.remove('shake');
    }, 450);
}

/**
 * Returns the praise for an accepted word.
 *
 * @param points - The word's points
 * @param pangram - Whether it is a pangram
 * @returns The praise
 */
function praise(points: number, pangram: boolean): string {
    if (pangram) return 'Pangram!';
    if (points === 1) return 'Good!';
    if (points <= 6) return 'Nice!';
    return 'Awesome!';
}

/**
 * Returns the message for a word that was already found: in family play, says who found it.
 *
 * @param word - The word
 * @returns The message
 */
function alreadyFoundMessage(word: string): string {
    const fam = session.family;
    const by = session.day.found.find((f) => f.w === word)?.by;
    if (!fam || !by) return ERRORS.found;
    if (by === session.user?.uid) return 'You already found that';
    return `Already found (by ${fam.members[by]?.name ?? 'someone'})`;
}

/**
 * Celebrates reaching a rank: a celebration for Genius and Perfect, a short message for the others.
 *
 * @param reached - The rank reached
 * @param byFamily - Whether the family reached it (in family play)
 */
function celebrate(reached: number, byFamily: boolean): void {
    if (reached === PERFECT_RANK || reached === GENIUS_RANK) {
        setTimeout(
            () =>
                showCelebration({
                    rankName: RANKS[reached].name,
                    score: score(),
                    words: session.found.size,
                    perfect: reached === PERFECT_RANK,
                    family: byFamily,
                }),
            900,
        );
    } else {
        const who = byFamily ? 'Your family reached ' : 'You reached ';
        setTimeout(() => showToast(h('span', {}, who, h('b', {}, RANKS[reached].name), '!')), 600);
    }
}

/**
 * Submits the word being typed: records it if it is an answer, and celebrates rank-ups and new badges. In family
 * play the word is sent to the family; the screen updates when it is saved.
 */
function submit(): void {
    if (!session.input || !session.puzzle) return;
    const result = checkGuess(session.input, session.puzzle, session.found);
    if (!result.ok) {
        rejectInput(result.error === 'found' ? alreadyFoundMessage(result.word) : ERRORS[result.error]);
        return;
    }
    flashMessage(praise(result.points, result.pangram), result.pangram ? 'pangram' : 'praise', result.points);
    if (result.pangram) hive.celebrate();
    session.input = '';
    if (inFamily()) {
        renderInput();
        addFamilyWord(result.word);
        return;
    }
    const before = rank();
    addFound(session.day, result.word);
    session.found.add(result.word);
    const after = rank();
    if (after >= GENIUS_RANK && !session.day.geniusAt) session.day.geniusAt = Date.now();
    saveDay(session.day);
    recordHistory();
    renderAll(result.word);
    checkAchievements();
    if (after > before) celebrate(after, false);
}

/**
 * Handles the physical keyboard: letters, Backspace, Enter and Space (shuffle). Ignored while a screen is open or a
 * text box has focus.
 *
 * @param e - The key event
 */
function onKey(e: KeyboardEvent): void {
    if (isModalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.body.classList.contains('connecting')) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (/^[a-zA-Z]$/.test(e.key)) {
        typeLetter(e.key.toLowerCase());
        e.preventDefault();
    } else if (e.key === 'Backspace') {
        backspace();
        e.preventDefault();
    } else if (e.key === 'Enter') {
        // Let Enter press a focused button (other than a letter)
        if (t && t.tagName === 'BUTTON' && !t.classList.contains('cell')) return;
        submit();
        e.preventDefault();
    } else if (e.key === ' ') {
        if (t && t.tagName === 'BUTTON') return;
        hive.shuffle();
        e.preventDefault();
    }
}

/**
 * Announces newly earned badges.
 *
 * @param badges - The badges, each with which stats it's for ('' for local play)
 */
function announceBadges(badges: { badge: EarnedBadge; where: string }[]): void {
    // A badge earned for this family and for all families at once is announced once
    const byKey = new Map<string, { badge: EarnedBadge; where: string[] }>();
    for (const { badge, where } of badges) {
        const entry = byKey.get(badge.key) ?? { badge, where: [] };
        if (where) entry.where.push(where);
        byKey.set(badge.key, entry);
    }
    for (const { badge, where } of byKey.values()) {
        showToast(
            h(
                'span',
                { class: 'ach-toast' },
                h('span', { class: 'ach-icon', 'aria-hidden': 'true' }, badge.icon),
                h(
                    'span',
                    {},
                    h('small', {}, where.length ? `Badge earned ${where.join(' and ')}` : 'Badge earned'),
                    h('b', {}, badge.name),
                    h('small', {}, badge.desc),
                ),
            ),
            {
                duration: 4500,
                className: 'achievement',
                action: { label: 'View', onClick: () => openStats('badges') },
            },
        );
    }
}

/**
 * Checks for newly earned badges in local play, saves them, and announces them.
 *
 * @param event - Something the player just did that a badge is for (e.g. 'yesterday')
 */
function checkAchievements(event?: string): void {
    if (inFamily()) return;
    const fresh = evaluateAchievements(
        {
            stats: localStats(),
            history: session.history,
            todayKey: session.todayKey,
            day: session.day,
            puzzle: session.puzzle,
            rank: rank(),
            event,
        },
        session.unlocked,
    );
    if (!fresh.length) return;
    setJSON('achievements', session.unlocked);
    announceBadges(fresh.map((badge) => ({ badge, where: '' })));
}

/**
 * Returns the scopes the Stats screen can show: local play, each family, and all families together.
 *
 * @returns The scopes, with their labels
 */
function statsScopes(): { scope: StatsScope; label: string }[] {
    const scopes: { scope: StatsScope; label: string }[] = [
        { scope: { kind: 'local' }, label: 'Just me (this device)' },
    ];
    for (const f of session.personal.families) {
        scopes.push({ scope: { kind: 'family', fid: f.fid, name: f.name }, label: `Me, with ${f.name}` });
    }
    if (session.personal.families.length > 1) scopes.push({ scope: { kind: 'all' }, label: 'Me, in all my families' });
    return scopes;
}

/**
 * Opens the Stats screen, showing the stats for the mode being played first.
 *
 * @param tab - Which tab to show
 */
function openStats(tab: 'stats' | 'badges' = 'stats'): void {
    const scopes = statsScopes();
    const mode = session.mode;
    const initial =
        mode.kind === 'family' ? scopes.findIndex((s) => s.scope.kind === 'family' && s.scope.fid === mode.fid) : 0;
    showStats({
        scopes,
        initial: Math.max(0, initial),
        tab,
        dataFor: (scope) => {
            if (scope.kind === 'local') {
                const key = dayKey();
                const today =
                    mode.kind === 'local' ? summarizeDay(session.day, session.puzzle) : (session.history[key] ?? null);
                return { stats: localStats(), today, unlocked: session.unlocked, team: null };
            }
            if (scope.kind === 'family') {
                const current = session.family?.fid === scope.fid;
                const hist = familyHistory(scope.fid);
                const key = current ? session.todayKey : dayKey();
                return {
                    stats: lifetimeStats(hist, key),
                    today: current ? myFamilySummary() : (hist[key] ?? null),
                    unlocked: session.personal.achievements[scope.fid] ?? {},
                    team: current ? teamShares() : null,
                };
            }
            const hist = allFamiliesHistory();
            return {
                stats: lifetimeStats(hist, session.todayKey || dayKey()),
                today: null,
                unlocked: session.personal.achievements[ALL_FAMILIES] ?? {},
                team: null,
            };
        },
    });
}

/**
 * Opens Yesterday's Answers.
 */
function openYesterday(): void {
    if (inFamily()) {
        void openFamilyYesterday();
        return;
    }
    const key = addDays(session.todayKey, -1);
    const day = loadDay(key);
    showYesterday(key, day, puzzleForDay(day, session.wordlist, session.puzzleLines));
    checkAchievements('yesterday');
}

/**
 * Opens the Hints screen, recording when the hints are shown.
 */
function openHints(): void {
    showHints(session.puzzle, session.found, session.myDay.hintsUsed, () => {
        if (session.myDay.hintsUsed) return;
        if (inFamily()) {
            markFamilyHints();
            return;
        }
        session.day.hintsUsed = true;
        saveDay(session.day);
        recordHistory();
    });
}

/**
 * Opens the welcome screen.
 */
function openSplash(): void {
    const family = inFamily();
    const history = session.mode.kind === 'family' ? familyHistory(session.mode.fid) : session.history;
    showSplash({
        todayKey: session.todayKey,
        today: family ? (session.myDay.found.length ? myFamilySummary() : undefined) : history[session.todayKey],
        yesterday: history[addDays(session.todayKey, -1)],
        stats: currentStats(),
        familyName: familyName(),
        nytChoice: family ? familyNytChoice() : null,
        onYesterday: openYesterday,
    });
}

/**
 * Loads an imported puzzle as today's puzzle (the family's, in family play), unless the data is invalid or today is
 * already locked in. Asks first if the puzzle is for a different date.
 *
 * @param text - The payload text (or a URL / hash containing it)
 */
function importPuzzle(text: string): void {
    const check = validatePayload(parsePayload(text));
    if (!check.ok) {
        closeModal();
        showToast(INVALID_MESSAGE, { duration: 6000 });
        return;
    }
    const p = check.puzzle;
    const familyWaiting = inFamily() && !session.family?.data;
    if (!familyWaiting && isLocked(session.day)) {
        closeModal();
        showToast(
            "A word has already been found today, so today's puzzle is locked. The imported puzzle wasn't loaded.",
            {
                duration: 6000,
            },
        );
        return;
    }
    if (
        !familyWaiting &&
        p.printDate &&
        p.printDate !== session.todayKey &&
        !confirm(
            `This puzzle is for ${formatLongDate(p.printDate)}, but today is ${formatLongDate(session.todayKey)}. ` +
                'Load it anyway?',
        )
    ) {
        return;
    }
    closeModal();
    if (inFamily()) {
        const problem = importIntoFamily(text, p);
        if (problem) showToast(problem, { duration: 7000 });
        return;
    }
    setSource(session.day, 'nyt', p);
    saveDay(session.day);
    openLocalDay(session.todayKey);
    showToast("Today's NYT puzzle is loaded. Have fun!");
}

/** What the Menu screen can ask for */
const settingsActions: SettingsActions = {
    setTheme(v) {
        session.theme = v;
        setJSON('theme', v);
        applyTheme();
    },
    importPayload(text) {
        importPuzzle(text);
    },
    useGenerated() {
        if (inFamily()) {
            useGeneratedInFamily();
            return;
        }
        if (setSource(session.day, 'generated')) {
            saveDay(session.day);
            openLocalDay(session.todayKey);
            showToast("Switched to today's generated puzzle.");
        }
    },
    resetAll() {
        for (const k of Object.keys(session.history)) remove(`day:${k}`);
        remove(`day:${dayKey()}`);
        remove('history');
        remove('achievements');
        session.history = {};
        session.unlocked = {};
        closeModal();
        if (!inFamily()) openLocalDay(session.todayKey);
        showToast('All progress on this device was erased. Family play is saved with the family, so it is unchanged.');
    },
};

/**
 * Reads the address's `#`: imported puzzle data (`#nyt=...`) or an invite link (`#join=...`), and removes it straight
 * away. That keeps puzzle answers and invite codes out of the browser history, and stops them being used again on
 * reload.
 *
 * @returns The puzzle data and invite, if any
 */
function readHash(): { nyt: string | null; join: InviteLink | null } {
    const hash = location.hash.slice(1);
    const nyt = hash.startsWith('nyt=') ? hash : null;
    const join = parseInviteLink(hash);
    if (nyt || join) history.replaceState(null, '', location.pathname + location.search);
    return { nyt, join };
}

/**
 * Moves to the new day if the date has changed while the game was open (in the family's timezone, in family play).
 */
function checkRollover(): void {
    if (!session.puzzle) return;
    if (inFamily()) {
        if (!session.family?.meta) return;
        const key = familyDayKey();
        if (key === session.todayKey) return;
        closeModal();
        openFamilyDay(key, true);
        return;
    }
    const key = dayKey();
    if (key === session.todayKey) return;
    closeModal();
    openLocalDay(key);
    openSplash();
}

/**
 * Registers the service worker (offline play), and offers a reload when a new version is ready. It is skipped on
 * localhost (so edits show up on reload) unless the address has `?sw`.
 */
function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return;
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !new URLSearchParams(location.search).has('sw')) {
        navigator.serviceWorker
            .getRegistrations()
            .then((regs) => regs.forEach((r) => r.unregister()))
            .catch(() => {});
        return;
    }
    // Only reload when the player asked for the update; the first install also fires controllerchange (from
    // clients.claim()) and must not reload the page
    let userAskedToUpdate = false;
    navigator.serviceWorker
        .register('sw.js')
        .then((reg) => {
            const promptUpdate = (worker: ServiceWorker): void => {
                showToast('Update available', {
                    duration: 0,
                    action: {
                        label: 'Reload',
                        onClick: () => {
                            userAskedToUpdate = true;
                            worker.postMessage('skipWaiting');
                        },
                    },
                });
            };
            if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
            reg.addEventListener('updatefound', () => {
                const w = reg.installing;
                w?.addEventListener('statechange', () => {
                    if (w.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(w);
                });
            });
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) reg.update().catch(() => {});
            });
        })
        .catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading || !userAskedToUpdate) return;
        reloading = true;
        location.reload();
    });
}

/**
 * Sets up the buttons, the honeycomb, the found-words box and the keyboard.
 */
function wireUi(): void {
    hive = createHive(getElement('hive'), typeLetter);
    wordbox = createWordbox(getElement('wordbox'));
    const toolbar: [string, Parameters<typeof icon>[0], string, () => void][] = [
        ['hints', 'hint', 'Hints', openHints],
        ['yesterday', 'yesterday', "Yesterday's answers", openYesterday],
        ['stats', 'stats', 'Stats and badges', () => openStats()],
        ['help', 'help', 'How to play', showHelp],
        [
            'menu',
            'settings',
            'Menu',
            () =>
                showSettings({
                    theme: session.theme,
                    day: session.day,
                    locked: isLocked(session.day),
                    nytAllowed: !inFamily() || !!session.family?.nytEnabled,
                    actions: settingsActions,
                }),
        ],
    ];
    for (const [id, ic, label, fn] of toolbar) {
        getElement('tools').append(
            h(
                'button',
                { id: `btn-${id}`, class: 'icon-btn', type: 'button', 'aria-label': label, title: label, onclick: fn },
                icon(ic),
            ),
        );
    }
    getElement('btn-delete').addEventListener('click', backspace);
    getElement('btn-enter').addEventListener('click', submit);
    getElement('btn-shuffle').replaceChildren(icon('shuffle'));
    getElement('btn-shuffle').addEventListener('click', () => hive.shuffle());
    getElement('progress').addEventListener('click', () => showRankings(score(), session.puzzle.maxScore));
    getElement('source-badge').addEventListener('click', () => showNytImport(settingsActions));
    getElement('mode-chip').addEventListener('click', () => void openPlayMode());
    getElement('btn-play-local').addEventListener('click', () => switchToLocal('Playing on your own for now.'));
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkRollover();
    });
    setInterval(checkRollover, 30000);
    initFamily({
        render: renderAll,
        dayChanged,
        showConnecting,
        showReady,
        openSplash,
        openLocal: () => openLocalDay(dayKey()),
        celebrate: (r) => celebrate(r, true),
        announceBadges,
        importPuzzle,
        showNytImport: () => showNytImport(settingsActions),
        flash: (text) => flashMessage(text, 'error'),
    });
}

/**
 * Starts the game: loads the saved progress and the word lists, then opens today's puzzle (locally, or with the
 * family the player last played with) and shows the welcome screen. If the address has an imported puzzle it is
 * loaded instead; an invite link opens the Join screen.
 */
export async function startApp(): Promise<void> {
    document.title = APP_NAME;
    loadPersistent();
    applyTheme();
    const pending = readHash();
    wireUi();
    renderModeChip();
    try {
        const [wordlist, lines] = await Promise.all([
            loadWordlist('data/words.txt'),
            fetch('data/puzzles.txt').then((r) => {
                if (!r.ok) throw new Error(`Could not load puzzles (${r.status})`);
                return r.text();
            }),
        ]);
        session.wordlist = wordlist;
        session.puzzleLines = parsePuzzles(lines);
    } catch (e) {
        getElement('loading').textContent = "Couldn't load the puzzle. Check your connection and reload.";
        console.error(e);
        return;
    }
    getElement('loading').remove();
    document.body.classList.add('ready');
    const savedMode = getJSON<PlayMode>('mode', { kind: 'local' });
    // Local play is opened first either way, so there's always a puzzle (family play replaces it once connected)
    openLocalDay(dayKey());
    if (savedMode.kind === 'family' && FAMILY_PLAY_AVAILABLE) {
        session.pendingImport = pending.nyt;
        void enterFamily(savedMode.fid, { splash: !pending.nyt && !pending.join });
    } else {
        checkAchievements();
        if (pending.nyt) importPuzzle(pending.nyt);
        else if (!pending.join) openSplash();
    }
    if (pending.join) openJoinFamily(pending.join);
    registerServiceWorker();
}
