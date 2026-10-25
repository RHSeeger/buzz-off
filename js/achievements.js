// Achievements and badges. Pure; no DOM.
//
// Tiered badges level up from a lifetime stat. One-off achievements are checked
// against the current day. Unlocks are stored as { [key]: { at, day } } where a
// tiered key is "<id>:<tierIndex>".

import { GENIUS_RANK } from './config.js';
import { addDays, daysBetween, weekday } from './dates.js';
import { previousPlayedDay } from './stats.js';

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

export const TIERED = [
  { id: 'words', name: 'Word Collector', icon: '🐝', stat: 'words', unit: 'words found', one: 'word found', tiers: [25, 100, 500, 2000, 10000] },
  { id: 'points', name: 'High Scorer', icon: '⭐', stat: 'points', unit: 'points scored', one: 'point scored', tiers: [100, 1000, 5000, 20000, 75000] },
  { id: 'pangrams', name: 'Pangram Hunter', icon: '🍯', stat: 'pangrams', unit: 'pangrams found', one: 'pangram found', tiers: [1, 10, 50, 150, 500] },
  { id: 'played', name: 'Regular', icon: '📅', stat: 'played', unit: 'puzzles played', one: 'puzzle played', tiers: [1, 7, 30, 100, 365] },
  { id: 'streak', name: 'On a Roll', icon: '🔥', stat: 'maxStreak', unit: 'day streak', one: 'day streak', tiers: [3, 7, 30, 100, 365] },
  { id: 'genius', name: 'Big Brain', icon: '🧠', stat: 'genius', unit: 'Genius days', one: 'Genius day', tiers: [1, 10, 50, 150, 365] },
  { id: 'perfect', name: 'Perfectionist', icon: '👑', stat: 'perfect', unit: 'Perfect days', one: 'Perfect day', tiers: [1, 5, 25, 75, 200] },
];

const foundWords = (ctx) => ctx.day.found.map((f) => f.w);

export const ONE_OFF = [
  {
    id: 'perfect-pangram', name: 'Flawless', icon: '💎',
    desc: 'Find a pangram that uses each letter exactly once.',
    check: (ctx) => foundWords(ctx).some((w) => w.length === 7 && ctx.puzzle.pangrams.includes(w)),
  },
  {
    id: 'opening-act', name: 'Opening Act', icon: '🎬',
    desc: 'Make a pangram your first word of the day.',
    check: (ctx) => ctx.day.found.length > 0 && ctx.puzzle.pangrams.includes(ctx.day.found[0].w),
  },
  {
    id: 'double-dip', name: 'Double Dip', icon: '🍯',
    desc: 'Find two or more pangrams in one puzzle.',
    check: (ctx) => foundWords(ctx).filter((w) => ctx.puzzle.pangrams.includes(w)).length >= 2,
  },
  {
    id: 'long-8', name: 'Long Stinger', icon: '📏',
    desc: 'Find a word with 8 or more letters.',
    check: (ctx) => foundWords(ctx).some((w) => w.length >= 8),
  },
  {
    id: 'long-10', name: 'Marathon Word', icon: '🏃',
    desc: 'Find a word with 10 or more letters.',
    check: (ctx) => foundWords(ctx).some((w) => w.length >= 10),
  },
  {
    id: 'wordsmith', name: 'Wordsmith', icon: '✍️',
    desc: 'Find 50 words in a single puzzle.',
    check: (ctx) => ctx.day.found.length >= 50,
  },
  {
    id: 'quick-buzz', name: 'Quick Buzz', icon: '⚡',
    desc: 'Find 5 words within 60 seconds.',
    check: (ctx) => {
      const t = ctx.day.found.map((f) => f.at).filter(Boolean).sort((a, b) => a - b);
      for (let i = 4; i < t.length; i++) if (t[i] - t[i - 4] <= 60000) return true;
      return false;
    },
  },
  {
    id: 'speed-demon', name: 'Speed Demon', icon: '🏎️',
    desc: 'Reach Genius within 20 minutes of your first word.',
    check: (ctx) => {
      const first = ctx.day.found[0]?.at;
      return !!(first && ctx.day.geniusAt && ctx.day.geniusAt - first <= 20 * 60000);
    },
  },
  {
    id: 'no-peeking', name: 'No Peeking', icon: '🙈',
    desc: 'Reach Genius without opening hints.',
    check: (ctx) => ctx.rank >= GENIUS_RANK && !ctx.day.hintsUsed,
  },
  {
    id: 'full-coverage', name: 'Full Coverage', icon: '🔤',
    desc: 'Find a word starting with every letter that starts an answer.',
    check: (ctx) => {
      const starts = new Set(ctx.puzzle.answers.map((w) => w[0]));
      const mine = new Set(foundWords(ctx).map((w) => w[0]));
      return starts.size >= 4 && [...starts].every((c) => mine.has(c));
    },
  },
  {
    id: 'early-bird', name: 'Early Bird', icon: '🌅',
    desc: 'Find a word between 4am and 7am.',
    check: (ctx) => ctx.day.found.some((f) => { const h = new Date(f.at).getHours(); return h >= 4 && h < 7; }),
  },
  {
    id: 'night-owl', name: 'Night Owl', icon: '🦉',
    desc: 'Find a word between 11pm and 4am.',
    check: (ctx) => ctx.day.found.some((f) => { const h = new Date(f.at).getHours(); return h >= 23 || h < 4; }),
  },
  {
    id: 'weekend-warrior', name: 'Weekend Warrior', icon: '🗓️',
    desc: 'Reach Genius on both Saturday and Sunday of the same weekend.',
    check: (ctx) => {
      if (ctx.rank < GENIUS_RANK || weekday(ctx.todayKey) !== 0) return false;
      return (ctx.history[addDays(ctx.todayKey, -1)]?.rank ?? -1) >= GENIUS_RANK;
    },
  },
  {
    id: 'welcome-back', name: 'Welcome Back', icon: '👋',
    desc: 'Return to play after a week or more away.',
    check: (ctx) => {
      if (!ctx.day.found.length) return false;
      const prev = previousPlayedDay(ctx.history, ctx.todayKey);
      return !!prev && daysBetween(prev, ctx.todayKey) >= 8;
    },
  },
  {
    id: 'guest-puzzle', name: 'Guest Puzzle', icon: '📬',
    desc: 'Play an imported puzzle.',
    check: (ctx) => ctx.day.source === 'nyt' && ctx.day.found.length > 0,
  },
  {
    id: 'look-back', name: 'Look Back', icon: '🔍',
    desc: "Check yesterday's answers.",
    check: (ctx) => ctx.event === 'yesterday',
  },
];

export function unitFor(def, n) {
  return n === 1 ? def.one : def.unit;
}

export function tierProgress(def, stats) {
  const value = stats[def.stat] || 0;
  let tier = -1;
  def.tiers.forEach((t, i) => { if (value >= t) tier = i; });
  const next = def.tiers[tier + 1] ?? null;
  return { value, tier, next, tierName: tier >= 0 ? TIER_NAMES[tier] : null };
}

// Returns newly unlocked achievements (and records them in `unlocked`).
export function evaluateAchievements(ctx, unlocked) {
  const fresh = [];
  const now = ctx.now ?? Date.now();
  for (const def of TIERED) {
    const { tier } = tierProgress(def, ctx.stats);
    for (let i = 0; i <= tier; i++) {
      const key = `${def.id}:${i}`;
      if (unlocked[key]) continue;
      unlocked[key] = { at: now, day: ctx.todayKey };
      // Only announce the highest newly earned tier.
      if (i === tier) fresh.push({ key, name: `${def.name} · ${TIER_NAMES[i]}`, icon: def.icon, desc: `${def.tiers[i].toLocaleString()} ${unitFor(def, def.tiers[i])}` });
    }
  }
  for (const def of ONE_OFF) {
    if (unlocked[def.id]) continue;
    let ok = false;
    try { ok = def.check(ctx); } catch { ok = false; }
    if (ok) {
      unlocked[def.id] = { at: now, day: ctx.todayKey };
      fresh.push({ key: def.id, name: def.name, icon: def.icon, desc: def.desc });
    }
  }
  return fresh;
}

export function achievementCount() {
  return TIERED.reduce((n, d) => n + d.tiers.length, 0) + ONE_OFF.length;
}
