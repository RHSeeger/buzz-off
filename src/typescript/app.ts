import { APP_NAME, MAX_INPUT_LENGTH } from './data/app';
import { GENIUS_RANK, PERFECT_RANK, RANKS } from './data/ranks';
import { evaluateAchievements } from './gamelogic/achievements';
import { addDays, dayKey, formatLongDate } from './gamelogic/dates';
import { addFound, isLocked, loadDay, puzzleForDay, saveDay, setSource } from './gamelogic/day';
import { INVALID_MESSAGE, parsePayload, validatePayload } from './gamelogic/nytImport';
import { checkGuess, parsePuzzles, rankIndexFor, scoreOf } from './gamelogic/puzzle';
import { getJSON, remove, setJSON } from './gamelogic/storage';
import { lifetimeStats, summarizeDay } from './gamelogic/stats';
import { loadWordlist } from './gamelogic/wordlist';
import type { DayState } from './types/DayState';
import type { GuessError } from './types/GuessError';
import type { Hive } from './types/Hive';
import type { History } from './types/History';
import type { LifetimeStats } from './types/LifetimeStats';
import type { Puzzle } from './types/Puzzle';
import type { SettingsActions } from './types/SettingsActions';
import type { Theme } from './types/Theme';
import type { UnlockedAchievements } from './types/UnlockedAchievements';
import type { Wordlist } from './types/Wordlist';
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
import type { Wordbox } from './types/Wordbox';

/**
 * The game: owns the state of the current session (today's puzzle, the words found, the history and badges), handles
 * the player's input, and keeps the screen up to date. Started by startApp(), from index.ts.
 */

/** The messages shown for a rejected guess */
const ERRORS: Record<GuessError, string> = {
    short: 'Too short',
    center: 'Missing center letter',
    letters: 'Bad letters',
    unknown: 'Not in word list',
    found: 'Already found',
};

/** The session's state. Set up by startApp() before anything reads it */
const state = {
    wordlist: null as unknown as Wordlist,
    puzzleLines: [] as string[],
    todayKey: '',
    day: null as unknown as DayState,
    puzzle: null as unknown as Puzzle,
    found: new Set<string>(),
    history: {} as History,
    unlocked: {} as UnlockedAchievements,
    input: '',
    theme: 'auto' as Theme,
};

/** The honeycomb and found-words box, made by wireUi() */
let hive: Hive;
let wordbox: Wordbox;

/**
 * Loads the history, badges and theme from storage.
 */
function loadPersistent(): void {
    state.history = getJSON<History>('history', {}) ?? {};
    state.unlocked = getJSON<UnlockedAchievements>('achievements', {}) ?? {};
    state.theme = getJSON<Theme>('theme', 'auto') ?? 'auto';
}

/**
 * Updates today's entry in the history, and saves the history.
 */
function recordHistory(): void {
    if (state.day.found.length) state.history[state.todayKey] = summarizeDay(state.day, state.puzzle);
    else delete state.history[state.todayKey];
    setJSON('history', state.history);
}

/**
 * Works out the all-time stats.
 *
 * @returns The stats
 */
function stats(): LifetimeStats {
    return lifetimeStats(state.history, state.todayKey);
}

/**
 * Returns today's score.
 *
 * @returns The score
 */
function score(): number {
    return scoreOf(state.found, state.puzzle);
}

/**
 * Switches the game to a day: loads its play and puzzle, and redraws.
 *
 * @param key - The day key
 */
function openDay(key: string): void {
    state.todayKey = key;
    state.day = loadDay(key);
    state.puzzle = puzzleForDay(state.day, state.wordlist, state.puzzleLines);
    state.found = new Set(state.day.found.map((f) => f.w));
    state.input = '';
    hive.setLetters(state.puzzle.center, state.puzzle.outer);
    getElement('date').textContent = formatLongDate(key);
    renderAll();
}

/**
 * Draws the word being typed: the center letter highlighted, letters not in the puzzle greyed out.
 */
function renderInput(): void {
    const { center, letters } = state.puzzle;
    getElement('input-text').replaceChildren(
        ...[...state.input].map((ch) =>
            h('span', { class: ch === center ? 'center' : letters.includes(ch) ? '' : 'bad' }, ch.toUpperCase()),
        ),
    );
    const input = getElement('input');
    input.classList.toggle('empty', state.input.length === 0);
    input.setAttribute(
        'aria-label',
        state.input ? `Current word: ${state.input.toUpperCase().split('').join(' ')}` : 'Current word: empty',
    );
}

/**
 * Redraws everything that changes during play.
 *
 * @param highlight - A word to flash in the found-words list (the one just found)
 */
function renderAll(highlight?: string): void {
    renderProgress(getElement('progress'), score(), state.puzzle.maxScore);
    wordbox.render(
        state.day.found.map((f) => f.w),
        state.puzzle,
        highlight,
    );
    renderInput();
    getElement('source-badge').hidden = state.puzzle.source !== 'nyt';
}

/**
 * Applies the light/dark choice to the page.
 */
function applyTheme(): void {
    if (state.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = state.theme;
}

/**
 * Adds a letter to the word being typed.
 *
 * @param ch - The letter, lowercase
 */
function typeLetter(ch: string): void {
    if (state.input.length >= MAX_INPUT_LENGTH) return;
    state.input += ch;
    hive.flash(ch);
    renderInput();
}

/**
 * Removes the last letter of the word being typed.
 */
function backspace(): void {
    state.input = state.input.slice(0, -1);
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
        state.input = '';
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
 * Submits the word being typed: records it if it is an answer, and celebrates rank-ups and new badges.
 */
function submit(): void {
    if (!state.input) return;
    const result = checkGuess(state.input, state.puzzle, state.found);
    if (!result.ok) {
        rejectInput(ERRORS[result.error]);
        return;
    }
    const before = rankIndexFor(score(), state.puzzle.maxScore);
    addFound(state.day, result.word);
    state.found.add(result.word);
    const after = rankIndexFor(score(), state.puzzle.maxScore);
    if (after >= GENIUS_RANK && !state.day.geniusAt) state.day.geniusAt = Date.now();
    saveDay(state.day);
    recordHistory();

    flashMessage(praise(result.points, result.pangram), result.pangram ? 'pangram' : 'praise', result.points);
    if (result.pangram) hive.celebrate();
    state.input = '';
    renderAll(result.word);

    checkAchievements();
    if (after > before) {
        if (after === PERFECT_RANK || after === GENIUS_RANK) {
            setTimeout(
                () =>
                    showCelebration({
                        rankName: RANKS[after].name,
                        score: score(),
                        words: state.found.size,
                        perfect: after === PERFECT_RANK,
                    }),
                900,
            );
        } else {
            setTimeout(() => showToast(h('span', {}, 'You reached ', h('b', {}, RANKS[after].name), '!')), 600);
        }
    }
}

/**
 * Handles the physical keyboard: letters, Backspace, Enter and Space (shuffle). Ignored while a screen is open or a
 * text box has focus.
 *
 * @param e - The key event
 */
function onKey(e: KeyboardEvent): void {
    if (isModalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
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
 * Checks for newly earned badges, saves them, and announces them.
 *
 * @param event - Something the player just did that a badge is for (e.g. 'yesterday')
 */
function checkAchievements(event?: string): void {
    const fresh = evaluateAchievements(
        {
            stats: stats(),
            history: state.history,
            todayKey: state.todayKey,
            day: state.day,
            puzzle: state.puzzle,
            rank: rankIndexFor(score(), state.puzzle.maxScore),
            event,
        },
        state.unlocked,
    );
    if (!fresh.length) return;
    setJSON('achievements', state.unlocked);
    for (const a of fresh) {
        showToast(
            h(
                'span',
                { class: 'ach-toast' },
                h('span', { class: 'ach-icon', 'aria-hidden': 'true' }, a.icon),
                h('span', {}, h('small', {}, 'Badge earned'), h('b', {}, a.name), h('small', {}, a.desc)),
            ),
            { duration: 4500, className: 'achievement', action: { label: 'View', onClick: () => openStats('badges') } },
        );
    }
}

/**
 * Opens the Stats screen.
 *
 * @param tab - Which tab to show
 */
function openStats(tab: 'stats' | 'badges' = 'stats'): void {
    const today = state.history[state.todayKey] ?? summarizeDay(state.day, state.puzzle);
    showStats({ stats: stats(), today, unlocked: state.unlocked, tab });
}

/**
 * Opens Yesterday's Answers.
 */
function openYesterday(): void {
    const key = addDays(state.todayKey, -1);
    const day = loadDay(key);
    showYesterday(key, day, puzzleForDay(day, state.wordlist, state.puzzleLines));
    checkAchievements('yesterday');
}

/**
 * Opens the Hints screen, recording when the hints are shown.
 */
function openHints(): void {
    showHints(state.puzzle, state.found, state.day.hintsUsed, () => {
        if (state.day.hintsUsed) return;
        state.day.hintsUsed = true;
        saveDay(state.day);
        recordHistory();
    });
}

/**
 * Opens the welcome screen.
 */
function openSplash(): void {
    showSplash({
        todayKey: state.todayKey,
        today: state.history[state.todayKey],
        yesterday: state.history[addDays(state.todayKey, -1)],
        stats: stats(),
        onYesterday: openYesterday,
    });
}

/**
 * Loads an imported puzzle as today's puzzle, unless the data is invalid or today is already locked in. Asks first
 * if the puzzle is for a different date.
 *
 * @param text - The payload text (or a URL / hash containing it)
 * @returns True if it was loaded
 */
function importPuzzle(text: string): boolean {
    const check = validatePayload(parsePayload(text));
    if (!check.ok) {
        closeModal();
        showToast(INVALID_MESSAGE, { duration: 6000 });
        return false;
    }
    const p = check.puzzle;
    if (isLocked(state.day)) {
        closeModal();
        showToast("You've already found words today, so today's puzzle is locked. The imported puzzle wasn't loaded.", {
            duration: 6000,
        });
        return false;
    }
    if (
        p.printDate &&
        p.printDate !== state.todayKey &&
        !confirm(
            `This puzzle is for ${formatLongDate(p.printDate)}, but today is ${formatLongDate(state.todayKey)}. ` +
                'Load it anyway?',
        )
    ) {
        return false;
    }
    setSource(state.day, 'nyt', p);
    saveDay(state.day);
    closeModal();
    openDay(state.todayKey);
    showToast("Today's NYT puzzle is loaded. Have fun!");
    return true;
}

/** What the Menu screen can ask for */
const settingsActions: SettingsActions = {
    setTheme(v) {
        state.theme = v;
        setJSON('theme', v);
        applyTheme();
    },
    importPayload(text) {
        importPuzzle(text);
    },
    useGenerated() {
        if (setSource(state.day, 'generated')) {
            saveDay(state.day);
            openDay(state.todayKey);
            showToast("Switched to today's generated puzzle.");
        }
    },
    resetAll() {
        for (const k of Object.keys(state.history)) remove(`day:${k}`);
        remove(`day:${state.todayKey}`);
        remove('history');
        remove('achievements');
        state.history = {};
        state.unlocked = {};
        closeModal();
        openDay(state.todayKey);
        showToast('All progress erased.');
    },
};

/**
 * Reads imported puzzle data from the address (`#nyt=...`), and removes it straight away: that keeps the answers out
 * of the browser history, and stops it importing again on reload.
 *
 * @returns The hash text, or null if there isn't any
 */
function readHash(): string | null {
    const hash = location.hash.slice(1);
    if (!hash.startsWith('nyt=')) return null;
    history.replaceState(null, '', location.pathname + location.search);
    return hash;
}

/**
 * Moves to the new day if the date has changed while the game was open.
 */
function checkRollover(): void {
    const key = dayKey();
    if (key === state.todayKey) return;
    closeModal();
    openDay(key);
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
                    theme: state.theme,
                    day: state.day,
                    locked: isLocked(state.day),
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
    getElement('progress').addEventListener('click', () => showRankings(score(), state.puzzle.maxScore));
    getElement('source-badge').addEventListener('click', () => showNytImport(settingsActions));
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkRollover();
    });
    setInterval(checkRollover, 30000);
}

/**
 * Starts the game: loads the saved progress and the word lists, opens today's puzzle, then shows the welcome screen
 * (or loads an imported puzzle, if the address has one).
 */
export async function startApp(): Promise<void> {
    document.title = APP_NAME;
    loadPersistent();
    applyTheme();
    const pendingHash = readHash();
    wireUi();
    try {
        const [wordlist, lines] = await Promise.all([
            loadWordlist('data/words.txt'),
            fetch('data/puzzles.txt').then((r) => {
                if (!r.ok) throw new Error(`Could not load puzzles (${r.status})`);
                return r.text();
            }),
        ]);
        state.wordlist = wordlist;
        state.puzzleLines = parsePuzzles(lines);
    } catch (e) {
        getElement('loading').textContent = "Couldn't load the puzzle. Check your connection and reload.";
        console.error(e);
        return;
    }
    getElement('loading').remove();
    document.body.classList.add('ready');
    openDay(dayKey());
    checkAchievements();
    if (pendingHash) importPuzzle(pendingHash);
    else openSplash();
    registerServiceWorker();
}
