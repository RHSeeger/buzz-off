import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifetimeStats, summarizeDay, previousPlayedDay } from '../js/stats.js';
import { evaluateAchievements, tierProgress, TIERED, achievementCount } from '../js/achievements.js';
import { makePuzzle } from '../js/puzzle.js';
import { GENIUS_RANK, PERFECT_RANK } from '../js/config.js';
import { addFound, isLocked, newDay, setSource } from '../js/day.js';

const puzzle = makePuzzle({ center: 'a', outer: ['b', 'd', 'e', 'g', 'l', 'm'], answers: ['able', 'abed', 'amble', 'gambled', 'bagel', 'label'] });
const h = (score, rank, words = 3) => ({ score, max: 100, words, total: 10, pangrams: 0, perfectPangrams: 0, rank, longest: 'abcd' });

test('summarizeDay', () => {
  const day = newDay('2026-10-24');
  addFound(day, 'able', 1000);
  addFound(day, 'gambled', 2000);
  const s = summarizeDay(day, puzzle);
  assert.equal(s.score, 15);
  assert.equal(s.words, 2);
  assert.equal(s.pangrams, 1);
  assert.equal(s.perfectPangrams, 1);
  assert.equal(s.longest, 'gambled');
  assert.equal(s.firstAt, 1000);
});

test('streaks', () => {
  const history = {
    '2026-10-01': h(10, 2), '2026-10-02': h(10, 2), '2026-10-03': h(10, 2), '2026-10-04': h(10, 2),
    '2026-10-10': h(80, GENIUS_RANK), '2026-10-11': h(80, GENIUS_RANK), '2026-10-12': h(100, PERFECT_RANK),
  };
  let s = lifetimeStats(history, '2026-10-12');
  assert.equal(s.played, 7);
  assert.equal(s.streak, 3);
  assert.equal(s.maxStreak, 4);
  assert.equal(s.genius, 3);
  assert.equal(s.perfect, 1);
  assert.equal(s.geniusStreak, 3);
  // Not played yet today: streak still alive from yesterday.
  s = lifetimeStats(history, '2026-10-13');
  assert.equal(s.streak, 3);
  // Missed a day: streak broken.
  s = lifetimeStats(history, '2026-10-14');
  assert.equal(s.streak, 0);
  assert.equal(previousPlayedDay(history, '2026-10-10'), '2026-10-04');
});

test('days with zero words do not count', () => {
  const s = lifetimeStats({ '2026-10-01': h(0, 0, 0) }, '2026-10-01');
  assert.equal(s.played, 0);
  assert.equal(s.streak, 0);
});

test('locking: first word locks the day as generated', () => {
  const day = newDay('2026-10-24');
  assert.ok(setSource(day, 'nyt', { center: 'a' }));
  assert.ok(setSource(day, 'generated'));
  assert.equal(day.nyt, null);
  const d2 = newDay('2026-10-24');
  addFound(d2, 'able');
  assert.equal(d2.source, 'generated');
  assert.ok(isLocked(d2));
  assert.equal(setSource(d2, 'nyt', {}), false);
});

test('tier progress', () => {
  const def = TIERED.find((d) => d.id === 'words');
  assert.equal(tierProgress(def, { words: 0 }).tier, -1);
  assert.equal(tierProgress(def, { words: 25 }).tier, 0);
  assert.equal(tierProgress(def, { words: 499 }).next, 500);
  assert.equal(tierProgress(def, { words: 1e6 }).next, null);
});

test('achievements unlock once', () => {
  const day = newDay('2026-10-24');
  const t0 = new Date(2026, 9, 24, 12, 0, 0).getTime();
  ['able', 'abed', 'amble', 'bagel', 'gambled'].forEach((w, i) => addFound(day, w, t0 + i * 5000));
  const stats = { words: 30, points: 0, pangrams: 1, played: 1, maxStreak: 1, genius: 0, perfect: 0 };
  const unlocked = {};
  const ctx = { stats, history: {}, todayKey: '2026-10-24', day, puzzle, rank: 3 };
  const fresh = evaluateAchievements(ctx, unlocked);
  const keys = fresh.map((f) => f.key);
  assert.ok(keys.includes('words:0'));
  assert.ok(keys.includes('pangrams:0'));
  assert.ok(keys.includes('played:0'));
  assert.ok(keys.includes('perfect-pangram'));
  assert.ok(keys.includes('quick-buzz'));
  assert.ok(!keys.includes('opening-act'));
  assert.ok(!keys.includes('no-peeking'));
  assert.deepEqual(evaluateAchievements(ctx, unlocked), []);
  assert.ok(Object.keys(unlocked).length <= achievementCount());
});

test('jumping several tiers records all but announces the top one', () => {
  const unlocked = {};
  const day = newDay('2026-10-24');
  const fresh = evaluateAchievements({ stats: { words: 600 }, history: {}, todayKey: '2026-10-24', day, puzzle, rank: 0 }, unlocked);
  assert.ok(unlocked['words:0'] && unlocked['words:1'] && unlocked['words:2']);
  assert.deepEqual(fresh.filter((f) => f.key.startsWith('words')).map((f) => f.key), ['words:2']);
});
