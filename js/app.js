// Entry point: loads data, owns game state, wires the UI.

import { APP_NAME, GENIUS_RANK, PERFECT_RANK, RANKS } from './config.js';
import { addDays, dayKey, formatLongDate } from './dates.js';
import { loadWordlist } from './wordlist.js';
import { checkGuess, parsePuzzles, rankIndexFor, scoreOf } from './puzzle.js';
import { addFound, isLocked, loadDay, puzzleForDay, saveDay, setSource } from './day.js';
import { getJSON, setJSON, remove } from './storage.js';
import { lifetimeStats, summarizeDay } from './stats.js';
import { evaluateAchievements } from './achievements.js';
import { INVALID_MESSAGE, parsePayload, validatePayload } from './nyt.js';
import { h, icon } from './ui/dom.js';
import { createHive } from './ui/hive.js';
import { isModalOpen, closeModal } from './ui/modal.js';
import { flashMessage, showToast } from './ui/toast.js';
import { createWordbox, renderProgress } from './ui/progress.js';
import { showHelp } from './ui/help.js';
import { showRankings } from './ui/rankings.js';
import { showHints } from './ui/hints.js';
import { showYesterday } from './ui/yesterday.js';
import { showStats } from './ui/stats-view.js';
import { showNytImport, showSettings } from './ui/settings.js';
import { showCelebration, showSplash } from './ui/splash.js';

const MAX_INPUT = 19;

const state = {
  wordlist: null,
  puzzleLines: null,
  todayKey: null,
  day: null,
  puzzle: null,
  found: new Set(),
  history: {},
  unlocked: {},
  input: '',
  theme: 'auto',
};

const $ = (id) => document.getElementById(id);
let hive, wordbox;

// --- persistence ----------------------------------------------------------------

function loadPersistent() {
  state.history = getJSON('history', {}) || {};
  state.unlocked = getJSON('achievements', {}) || {};
  state.theme = getJSON('theme', 'auto') || 'auto';
}

function recordHistory() {
  if (state.day.found.length) state.history[state.todayKey] = summarizeDay(state.day, state.puzzle);
  else delete state.history[state.todayKey];
  setJSON('history', state.history);
}

function stats() {
  return lifetimeStats(state.history, state.todayKey);
}

// --- day / puzzle -------------------------------------------------------------------

function openDay(key) {
  state.todayKey = key;
  state.day = loadDay(key);
  state.puzzle = puzzleForDay(state.day, state.wordlist, state.puzzleLines);
  state.found = new Set(state.day.found.map((f) => f.w));
  state.input = '';
  hive.setLetters(state.puzzle.center, state.puzzle.outer);
  $('date').textContent = formatLongDate(key);
  renderAll();
}

function score() {
  return scoreOf(state.found, state.puzzle);
}

// --- rendering ----------------------------------------------------------------------

function renderInput() {
  const el = $('input-text');
  el.replaceChildren(...[...state.input].map((ch) =>
    h('span', { class: ch === state.puzzle.center ? 'center' : state.puzzle.letters.includes(ch) ? '' : 'bad' }, ch.toUpperCase())));
  $('input').classList.toggle('empty', state.input.length === 0);
  $('input').setAttribute('aria-label', state.input ? `Current word: ${state.input.toUpperCase().split('').join(' ')}` : 'Current word: empty');
}

function renderAll(highlight) {
  renderProgress($('progress'), score(), state.puzzle.maxScore);
  wordbox.render(state.day.found.map((f) => f.w), state.puzzle, highlight);
  renderInput();
  $('source-badge').hidden = state.puzzle.source !== 'nyt';
}

function applyTheme() {
  if (state.theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.theme;
}

// --- input ----------------------------------------------------------------------------

function typeLetter(ch) {
  if (state.input.length >= MAX_INPUT) return;
  state.input += ch;
  hive.flash(ch);
  renderInput();
}

function backspace() {
  state.input = state.input.slice(0, -1);
  renderInput();
}

const ERRORS = {
  short: 'Too short',
  center: 'Missing center letter',
  letters: 'Bad letters',
  unknown: 'Not in word list',
  found: 'Already found',
};

function rejectInput(text) {
  flashMessage(text, 'error');
  const el = $('input');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => { state.input = ''; renderInput(); el.classList.remove('shake'); }, 450);
}

function praise(points, pangram) {
  if (pangram) return 'Pangram!';
  if (points === 1) return 'Good!';
  if (points <= 6) return 'Nice!';
  return 'Awesome!';
}

function submit() {
  if (!state.input) return;
  const result = checkGuess(state.input, state.puzzle, state.found);
  if (!result.ok) return rejectInput(ERRORS[result.error]);

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
      setTimeout(() => showCelebration({ rankName: RANKS[after].name, score: score(), words: state.found.size, perfect: after === PERFECT_RANK }), 900);
    } else {
      setTimeout(() => showToast(h('span', {}, 'You reached ', h('b', {}, RANKS[after].name), '!')), 600);
    }
  }
}

function onKey(e) {
  if (isModalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (/^[a-zA-Z]$/.test(e.key)) {
    typeLetter(e.key.toLowerCase());
    e.preventDefault();
  } else if (e.key === 'Backspace') {
    backspace();
    e.preventDefault();
  } else if (e.key === 'Enter') {
    // Let Enter activate focused buttons other than the hive.
    if (t && t.tagName === 'BUTTON' && !t.classList.contains('cell')) return;
    submit();
    e.preventDefault();
  } else if (e.key === ' ') {
    if (t && t.tagName === 'BUTTON') return;
    hive.shuffle();
    e.preventDefault();
  }
}

// --- achievements -------------------------------------------------------------------

function checkAchievements(event) {
  const fresh = evaluateAchievements({
    stats: stats(),
    history: state.history,
    todayKey: state.todayKey,
    day: state.day,
    puzzle: state.puzzle,
    rank: rankIndexFor(score(), state.puzzle.maxScore),
    event,
  }, state.unlocked);
  if (!fresh.length) return;
  setJSON('achievements', state.unlocked);
  fresh.forEach((a, i) => setTimeout(() => showToast(
    h('span', { class: 'ach-toast' },
      h('span', { class: 'ach-icon', 'aria-hidden': 'true' }, a.icon),
      h('span', {}, h('small', {}, 'Badge earned'), h('b', {}, a.name), h('small', {}, a.desc))),
    { duration: 4500, className: 'achievement', action: { label: 'View', onClick: () => openStats('badges') } },
  ), 700 + i * 900));
}

// --- screens --------------------------------------------------------------------------

function openStats(tab = 'stats') {
  const today = state.history[state.todayKey] || summarizeDay(state.day, state.puzzle);
  showStats({ stats: stats(), today, unlocked: state.unlocked, tab });
}

function yesterdayData() {
  const key = addDays(state.todayKey, -1);
  const day = loadDay(key);
  return { key, day, puzzle: puzzleForDay(day, state.wordlist, state.puzzleLines) };
}

function openYesterday() {
  const { key, day, puzzle } = yesterdayData();
  showYesterday(key, day, puzzle);
  checkAchievements('yesterday');
}

function openHints() {
  showHints(state.puzzle, state.found, state.day.hintsUsed, () => {
    if (state.day.hintsUsed) return;
    state.day.hintsUsed = true;
    saveDay(state.day);
    recordHistory();
  });
}

function openSplash() {
  const yKey = addDays(state.todayKey, -1);
  showSplash({
    todayKey: state.todayKey,
    today: state.history[state.todayKey],
    yesterday: state.history[yKey],
    stats: stats(),
    onPlay: () => {},
    onYesterday: openYesterday,
  });
}

const settingsActions = {
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

// --- imported puzzle ------------------------------------------------------------------

function importPuzzle(text) {
  const check = validatePayload(parsePayload(text));
  if (!check.ok) {
    closeModal();
    showToast(INVALID_MESSAGE, { duration: 6000 });
    return false;
  }
  const p = check.puzzle;
  if (isLocked(state.day)) {
    closeModal();
    showToast("You've already found words today, so today's puzzle is locked. The imported puzzle wasn't loaded.", { duration: 6000 });
    return false;
  }
  if (p.printDate && p.printDate !== state.todayKey &&
      !confirm(`This puzzle is for ${formatLongDate(p.printDate)}, but today is ${formatLongDate(state.todayKey)}. Load it anyway?`)) {
    return false;
  }
  setSource(state.day, 'nyt', p);
  saveDay(state.day);
  closeModal();
  openDay(state.todayKey);
  showToast("Today's NYT puzzle is loaded. Have fun!");
  return true;
}

function readHash() {
  const hash = location.hash.slice(1);
  if (!hash.startsWith('nyt=')) return null;
  // Remove the payload right away: keeps answers out of history and stops re-import on refresh.
  history.replaceState(null, '', location.pathname + location.search);
  return hash;
}

// --- day rollover -----------------------------------------------------------------------

function checkRollover() {
  const key = dayKey();
  if (key === state.todayKey) return;
  closeModal();
  openDay(key);
  openSplash();
}

// --- service worker -------------------------------------------------------------------

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Local dev: skip the cache so edits show up on reload (add ?sw to test it).
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !new URLSearchParams(location.search).has('sw')) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  // Only reload when the user asked for the update; the first install also
  // fires controllerchange (clients.claim) and must not reload the page.
  let userAskedToUpdate = false;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const promptUpdate = (worker) => showToast('Update available', {
      duration: 0,
      action: { label: 'Reload', onClick: () => { userAskedToUpdate = true; worker.postMessage('skipWaiting'); } },
    });
    if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(w);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !userAskedToUpdate) return;
    reloading = true;
    location.reload();
  });
}

// --- boot ---------------------------------------------------------------------------------

function wireUi() {
  hive = createHive($('hive'), typeLetter);
  wordbox = createWordbox($('wordbox'));
  const toolbar = [
    ['hints', 'hint', 'Hints', openHints],
    ['yesterday', 'yesterday', "Yesterday's answers", openYesterday],
    ['stats', 'stats', 'Stats and badges', () => openStats()],
    ['help', 'help', 'How to play', showHelp],
    ['menu', 'settings', 'Menu', () => showSettings({ theme: state.theme, day: state.day, locked: isLocked(state.day), actions: settingsActions })],
  ];
  for (const [id, ic, label, fn] of toolbar) {
    $('tools').append(h('button', { id: `btn-${id}`, class: 'icon-btn', type: 'button', 'aria-label': label, title: label, onclick: fn }, icon(ic)));
  }
  $('btn-delete').addEventListener('click', backspace);
  $('btn-enter').addEventListener('click', submit);
  $('btn-shuffle').replaceChildren(icon('shuffle'));
  $('btn-shuffle').addEventListener('click', () => hive.shuffle());
  $('progress').addEventListener('click', () => showRankings(score(), state.puzzle.maxScore));
  $('source-badge').addEventListener('click', () => showNytImport(settingsActions));
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRollover(); });
  setInterval(checkRollover, 30000);
}

async function boot() {
  document.title = APP_NAME;
  loadPersistent();
  applyTheme();
  const pendingHash = readHash();
  wireUi();
  try {
    const [wordlist, lines] = await Promise.all([
      loadWordlist('data/words.txt'),
      fetch('data/puzzles.txt').then((r) => { if (!r.ok) throw new Error('puzzles'); return r.text(); }),
    ]);
    state.wordlist = wordlist;
    state.puzzleLines = parsePuzzles(lines);
  } catch (e) {
    $('loading').textContent = "Couldn't load the puzzle. Check your connection and reload.";
    console.error(e);
    return;
  }
  $('loading').remove();
  document.body.classList.add('ready');
  openDay(dayKey());
  checkAchievements();
  if (pendingHash) importPuzzle(pendingHash);
  else openSplash();
  registerServiceWorker();
}

boot();
