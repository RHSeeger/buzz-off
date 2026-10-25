import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashString, mulberry32, seededRandom, shuffleInPlace } from '../js/prng.js';
import { dayKey, dayIndex, addDays, daysBetween, weekday } from '../js/dates.js';
import { letterMask, bitCount, parseWordlist } from '../js/wordlist.js';
import {
  parsePuzzles, decodePuzzleLine, puzzleLineForDay, computeAnswers, makePuzzle,
  scoreWord, isPangram, rankThresholds, rankIndexFor, checkGuess, hintData,
} from '../js/puzzle.js';
import { RANKS } from '../js/config.js';

const words = readFileSync(new URL('../data/words.txt', import.meta.url), 'utf8');
const lines = readFileSync(new URL('../data/puzzles.txt', import.meta.url), 'utf8');

test('PRNG is deterministic', () => {
  const a = mulberry32(42), b = mulberry32(42);
  const xs = Array.from({ length: 5 }, a), ys = Array.from({ length: 5 }, b);
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(Array.from({ length: 5 }, mulberry32(43)), xs);
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  assert.deepEqual(shuffleInPlace([1, 2, 3, 4, 5], seededRandom('x')), shuffleInPlace([1, 2, 3, 4, 5], seededRandom('x')));
});

test('day keys across timezones', () => {
  const t = new Date('2026-10-24T03:30:00Z');
  assert.equal(dayKey(t, 'UTC'), '2026-10-24');
  assert.equal(dayKey(t, 'America/New_York'), '2026-10-23');
  assert.equal(dayKey(t, 'Asia/Tokyo'), '2026-10-24');
  assert.equal(dayKey(new Date('2026-10-24T23:30:00Z'), 'Pacific/Auckland'), '2026-10-25');
});

test('day keys across DST transitions', () => {
  // US DST ends 2026-11-01 at 2am local. 04:59Z = 00:59 EDT; 05:30Z = 01:30 EDT/EST ambiguity zone.
  assert.equal(dayKey(new Date('2026-11-01T03:59:00Z'), 'America/New_York'), '2026-10-31');
  assert.equal(dayKey(new Date('2026-11-01T04:00:00Z'), 'America/New_York'), '2026-11-01');
  assert.equal(dayKey(new Date('2026-11-02T04:59:00Z'), 'America/New_York'), '2026-11-01');
  assert.equal(dayKey(new Date('2026-11-02T05:00:00Z'), 'America/New_York'), '2026-11-02');
  // Spring forward 2026-03-08.
  assert.equal(dayKey(new Date('2026-03-08T04:59:00Z'), 'America/New_York'), '2026-03-07');
  assert.equal(dayKey(new Date('2026-03-08T05:00:00Z'), 'America/New_York'), '2026-03-08');
  assert.equal(addDays('2026-03-07', 1), '2026-03-08');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02');
});

test('day index and date math', () => {
  assert.equal(dayIndex('2026-01-01'), 0);
  assert.equal(dayIndex('2026-01-02'), 1);
  assert.equal(dayIndex('2027-01-01'), 365);
  assert.equal(dayIndex('2025-12-31'), -1);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-10-01', '2026-10-24'), 23);
  assert.equal(weekday('2026-10-24'), 6); // Saturday
});

test('letter masks', () => {
  assert.equal(letterMask('abc'), 0b111);
  assert.equal(letterMask('aaa'), 1);
  assert.equal(bitCount(letterMask('pangram')), 6);
  assert.equal(bitCount(0), 0);
  assert.equal(bitCount(0x3ffffff), 26);
});

test('puzzle selection is stable and wraps', () => {
  const pz = parsePuzzles(lines);
  assert.ok(pz.length > 1000);
  assert.equal(puzzleLineForDay(pz, '2026-01-01'), pz[0]);
  assert.equal(puzzleLineForDay(pz, '2026-10-24'), puzzleLineForDay(pz, '2026-10-24'));
  assert.equal(puzzleLineForDay(pz, addDays('2026-01-01', pz.length)), pz[0]);
  assert.equal(puzzleLineForDay(pz, '2025-12-31'), pz[pz.length - 1]);
  assert.deepEqual(decodePuzzleLine('agbdelm'), { center: 'a', outer: ['g', 'b', 'd', 'e', 'l', 'm'] });
});

test('every precomputed puzzle has a pangram, no s, sane answer counts', () => {
  const wl = parseWordlist(words);
  const pz = parsePuzzles(lines);
  assert.equal(new Set(pz).size, pz.length, 'no duplicate puzzles');
  for (const line of pz.slice(0, 400)) {
    const { center, outer } = decodePuzzleLine(line);
    assert.equal(new Set(line).size, 7);
    assert.ok(!line.includes('s'));
    const p = makePuzzle({ center, outer, answers: computeAnswers(wl, center, outer) });
    assert.ok(p.pangrams.length >= 1, line);
    assert.ok(p.answers.length >= 20 && p.answers.length <= 70, line);
  }
});

test('answer computation', () => {
  const wl = parseWordlist('able\nbale\nbead\nlead\nbleed\nabled\nbeadle\nzzzz\nbalded\nbad\n');
  const ans = computeAnswers(wl, 'b', ['a', 'd', 'e', 'l', 'x', 'y']);
  assert.deepEqual(ans.sort(), ['abled', 'able', 'bale', 'balded', 'bead', 'beadle', 'bleed'].sort());
});

test('scoring and pangrams', () => {
  assert.equal(scoreWord('able', false), 1);
  assert.equal(scoreWord('abled', false), 5);
  assert.equal(scoreWord('gambled', true), 14);
  const letters = ['a', 'b', 'd', 'e', 'g', 'l', 'm'];
  assert.ok(isPangram('gambled', letters));
  assert.ok(!isPangram('gamble', letters));
  const p = makePuzzle({ center: 'a', outer: ['b', 'd', 'e', 'g', 'l', 'm'], answers: ['able', 'gambled', 'amble', 'gamble'] });
  assert.deepEqual(p.pangrams, ['gambled']);
  assert.equal(p.maxScore, 1 + 14 + 5 + 6);
});

test('rank thresholds', () => {
  const t = rankThresholds(200);
  assert.equal(t.length, RANKS.length);
  assert.equal(t[0].min, 0);
  assert.equal(t.find((r) => r.name === 'Genius').min, 140);
  assert.equal(t[t.length - 1].min, 200);
  assert.equal(RANKS[rankIndexFor(0, 200)].name, 'Seedling');
  assert.equal(RANKS[rankIndexFor(139, 200)].name, 'Brilliant');
  assert.equal(RANKS[rankIndexFor(140, 200)].name, 'Genius');
  assert.equal(RANKS[rankIndexFor(199, 200)].name, 'Genius');
  assert.equal(RANKS[rankIndexFor(200, 200)].name, 'Perfect');
  for (let i = 1; i < t.length; i++) assert.ok(t[i].min >= t[i - 1].min);
});

test('guess checking', () => {
  const p = makePuzzle({ center: 'a', outer: ['b', 'd', 'e', 'g', 'l', 'm'], answers: ['able', 'gambled', 'amble'] });
  const found = new Set(['able']);
  assert.equal(checkGuess('abe', p, found).error, 'short');
  assert.equal(checkGuess('bled', p, found).error, 'center');
  assert.equal(checkGuess('ablex', p, found).error, 'letters');
  assert.equal(checkGuess('able', p, found).error, 'found');
  assert.equal(checkGuess('blame', p, found).error, 'unknown');
  assert.deepEqual(checkGuess('GAMBLED', p, found), { ok: true, word: 'gambled', points: 14, pangram: true });
});

test('hint data counts remaining words', () => {
  const p = makePuzzle({ center: 'a', outer: ['b', 'd', 'e', 'g', 'l', 'm'], answers: ['able', 'gambled', 'amble', 'bale'] });
  const d = hintData(p, new Set(['able']));
  assert.equal(d.remainingWords, 3);
  assert.equal(d.grid.a[5], 1);
  assert.equal(d.grid.a[4], 0);
  assert.equal(d.grid.g[7], 1);
  assert.equal(d.twoLetter.ba, 1);
  assert.equal(d.remainingPangrams, 1);
  assert.equal(d.remainingPerfect, 1);
});
