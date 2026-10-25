// Per-day summaries and lifetime statistics. Pure; no DOM.

import { GENIUS_RANK, PERFECT_RANK, RANKS } from './config.js';
import { addDays, daysBetween } from './dates.js';
import { rankIndexFor, scoreOf } from './puzzle.js';

// Summary of one day's play, stored in history[dayKey].
export function summarizeDay(day, puzzle) {
  const words = day.found.map((f) => f.w);
  const score = scoreOf(words, puzzle);
  const rank = rankIndexFor(score, puzzle.maxScore);
  const pangrams = words.filter((w) => puzzle.pangrams.includes(w));
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), '');
  const times = day.found.map((f) => f.at).filter(Boolean);
  return {
    score,
    max: puzzle.maxScore,
    words: words.length,
    total: puzzle.answers.length,
    pangrams: pangrams.length,
    perfectPangrams: pangrams.filter((w) => w.length === 7).length,
    rank,
    longest,
    source: day.source,
    hints: !!day.hintsUsed,
    firstAt: times.length ? Math.min(...times) : null,
    lastAt: times.length ? Math.max(...times) : null,
    geniusAt: day.geniusAt || null,
  };
}

function streakEndingAt(played, key) {
  let n = 0;
  while (played.has(key)) { n++; key = addDays(key, -1); }
  return n;
}

export function lifetimeStats(history, todayKey) {
  const keys = Object.keys(history).filter((k) => history[k].words > 0).sort();
  const played = new Set(keys);
  const s = {
    played: keys.length,
    words: 0,
    points: 0,
    pangrams: 0,
    perfectPangrams: 0,
    genius: 0,
    perfect: 0,
    longest: '',
    streak: 0,
    maxStreak: 0,
    geniusStreak: 0,
    rankCounts: RANKS.map(() => 0),
    avgPct: 0,
  };
  let pctSum = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    const h = history[k];
    s.words += h.words;
    s.points += h.score;
    s.pangrams += h.pangrams;
    s.perfectPangrams += h.perfectPangrams || 0;
    if (h.rank >= GENIUS_RANK) s.genius++;
    if (h.rank === PERFECT_RANK) s.perfect++;
    if ((h.longest || '').length > s.longest.length) s.longest = h.longest;
    s.rankCounts[h.rank]++;
    pctSum += h.max ? h.score / h.max : 0;
    run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, run);
    prev = k;
  }
  s.avgPct = keys.length ? pctSum / keys.length : 0;
  // Current streak counts today if played, otherwise it is still alive from yesterday.
  s.streak = played.has(todayKey) ? streakEndingAt(played, todayKey) : streakEndingAt(played, addDays(todayKey, -1));
  let g = 0;
  let k = history[todayKey]?.rank >= GENIUS_RANK ? todayKey : addDays(todayKey, -1);
  while (history[k]?.rank >= GENIUS_RANK) { g++; k = addDays(k, -1); }
  s.geniusStreak = g;
  return s;
}

// Most recent played day strictly before `key`, or null.
export function previousPlayedDay(history, key) {
  const keys = Object.keys(history).filter((k) => k < key && history[k].words > 0).sort();
  return keys.length ? keys[keys.length - 1] : null;
}
