// Daily puzzle selection, answer computation, scoring and ranks. Pure; no DOM.

import { RANKS, MIN_WORD_LENGTH, PANGRAM_BONUS } from './config.js';
import { letterMask } from './wordlist.js';
import { dayIndex } from './dates.js';

export function parsePuzzles(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[a-z]{7}$/.test(l));
}

// "agbdelm" -> { center: 'a', outer: ['g','b','d','e','l','m'] }
export function decodePuzzleLine(line) {
  return { center: line[0], outer: line.slice(1).split('') };
}

export function puzzleLineForDay(puzzles, key) {
  const n = puzzles.length;
  const i = ((dayIndex(key) % n) + n) % n;
  return puzzles[i];
}

export function computeAnswers(wordlist, center, outer) {
  const allowed = letterMask(center + outer.join(''));
  const centerBit = letterMask(center);
  const out = [];
  const { words, masks } = wordlist;
  for (let i = 0; i < words.length; i++) {
    const m = masks[i];
    if ((m & centerBit) && (m & ~allowed) === 0 && words[i].length >= MIN_WORD_LENGTH) out.push(words[i]);
  }
  return out;
}

export function isPangram(word, letters) {
  const m = letterMask(word);
  return m === letterMask(letters.join(''));
}

// A pangram that uses each of the 7 letters exactly once.
export function isPerfectPangram(word, letters) {
  return word.length === 7 && isPangram(word, letters);
}

export function scoreWord(word, pangram) {
  const base = word.length === MIN_WORD_LENGTH ? 1 : word.length;
  return base + (pangram ? PANGRAM_BONUS : 0);
}

// Build a playable puzzle from letters + answers (answers computed or imported).
export function makePuzzle({ center, outer, answers, source = 'generated', printDate = null }) {
  const letters = [center, ...outer];
  const sorted = [...new Set(answers)].sort();
  const pangrams = sorted.filter((w) => isPangram(w, letters));
  const answerSet = new Set(sorted);
  const points = new Map(sorted.map((w) => [w, scoreWord(w, pangrams.includes(w))]));
  let maxScore = 0;
  for (const p of points.values()) maxScore += p;
  return { center, outer: [...outer], letters, answers: sorted, answerSet, pangrams, points, maxScore, source, printDate };
}

export function rankThresholds(maxScore) {
  return RANKS.map((r, i) => ({
    ...r,
    index: i,
    min: i === RANKS.length - 1 ? maxScore : Math.round(r.pct * maxScore),
  }));
}

export function rankIndexFor(score, maxScore) {
  const t = rankThresholds(maxScore);
  let idx = 0;
  for (let i = 0; i < t.length; i++) if (score >= t[i].min) idx = i;
  return idx;
}

export function scoreOf(words, puzzle) {
  let s = 0;
  for (const w of words) s += puzzle.points.get(w) || 0;
  return s;
}

// Returns { ok: true, word, points, pangram } or { ok: false, error }.
// error: 'short' | 'center' | 'letters' | 'unknown' | 'found'
export function checkGuess(raw, puzzle, foundSet) {
  const word = String(raw).toLowerCase();
  if (word.length < MIN_WORD_LENGTH) return { ok: false, error: 'short', word };
  const allowed = new Set(puzzle.letters);
  for (const ch of word) if (!allowed.has(ch)) return { ok: false, error: 'letters', word };
  if (!word.includes(puzzle.center)) return { ok: false, error: 'center', word };
  if (foundSet.has(word)) return { ok: false, error: 'found', word };
  if (!puzzle.answerSet.has(word)) return { ok: false, error: 'unknown', word };
  const pangram = puzzle.pangrams.includes(word);
  return { ok: true, word, points: puzzle.points.get(word), pangram };
}

// Hint data: remaining counts by first letter x length, plus two-letter starts.
export function hintData(puzzle, foundSet) {
  const remaining = puzzle.answers.filter((w) => !foundSet.has(w));
  const lengths = [...new Set(puzzle.answers.map((w) => w.length))].sort((a, b) => a - b);
  const firsts = [...puzzle.letters].sort();
  const grid = {};
  for (const f of firsts) grid[f] = Object.fromEntries(lengths.map((l) => [l, 0]));
  const twoLetter = {};
  for (const w of remaining) {
    grid[w[0]][w.length]++;
    const k = w.slice(0, 2);
    twoLetter[k] = (twoLetter[k] || 0) + 1;
  }
  const remainingPangrams = puzzle.pangrams.filter((w) => !foundSet.has(w));
  return {
    lengths,
    firsts,
    grid,
    twoLetter,
    remainingWords: remaining.length,
    remainingPoints: scoreOf(remaining, puzzle),
    remainingPangrams: remainingPangrams.length,
    remainingPerfect: remainingPangrams.filter((w) => w.length === 7).length,
  };
}
