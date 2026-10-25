// App constants. (The Firebase web config will live here too once family mode is added.)

export const APP_NAME = 'Buzz Off';
export const STORAGE_PREFIX = 'buzzoff:';

// Bump when data/words.txt changes in a way that changes answers.
export const WORDLIST_VERSION = 1;

// Day 0 of the puzzle list.
export const EPOCH_DAY = '2026-01-01';

export const MIN_WORD_LENGTH = 4;
export const PANGRAM_BONUS = 7;

// Our own rank names. pct = fraction of the max score.
export const RANKS = [
  { name: 'Seedling', pct: 0 },
  { name: 'Sprout', pct: 0.02 },
  { name: 'Budding', pct: 0.05 },
  { name: 'Growing', pct: 0.08 },
  { name: 'Blooming', pct: 0.15 },
  { name: 'Flourishing', pct: 0.25 },
  { name: 'Thriving', pct: 0.4 },
  { name: 'Brilliant', pct: 0.5 },
  { name: 'Genius', pct: 0.7 },
  { name: 'Perfect', pct: 1 },
];
export const GENIUS_RANK = RANKS.findIndex((r) => r.name === 'Genius');
export const PERFECT_RANK = RANKS.length - 1;
