import type { OneOffAchievement } from '../types/OneOffAchievement';
import type { TieredAchievement } from '../types/TieredAchievement';

/**
 * The list of badges: tiered badges that level up from an all-time stat, and one-off achievements earned in a single
 * puzzle. What earns each one-off achievement is in gamelogic/achievementChecks.ts.
 */

/** The names of the tiers, lowest first */
export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

/** The badges that level up */
export const TIERED: TieredAchievement[] = [
    {
        id: 'words',
        name: 'Word Collector',
        icon: '🐝',
        stat: 'words',
        unit: 'words found',
        one: 'word found',
        tiers: [25, 100, 500, 2000, 10000],
    },
    {
        id: 'points',
        name: 'High Scorer',
        icon: '⭐',
        stat: 'points',
        unit: 'points scored',
        one: 'point scored',
        tiers: [100, 1000, 5000, 20000, 75000],
    },
    {
        id: 'pangrams',
        name: 'Pangram Hunter',
        icon: '🍯',
        stat: 'pangrams',
        unit: 'pangrams found',
        one: 'pangram found',
        tiers: [1, 10, 50, 150, 500],
    },
    {
        id: 'played',
        name: 'Regular',
        icon: '📅',
        stat: 'played',
        unit: 'puzzles played',
        one: 'puzzle played',
        tiers: [1, 7, 30, 100, 365],
    },
    {
        id: 'streak',
        name: 'On a Roll',
        icon: '🔥',
        stat: 'maxStreak',
        unit: 'day streak',
        one: 'day streak',
        tiers: [3, 7, 30, 100, 365],
    },
    {
        id: 'genius',
        name: 'Big Brain',
        icon: '🧠',
        stat: 'genius',
        unit: 'Genius days',
        one: 'Genius day',
        tiers: [1, 10, 50, 150, 365],
    },
    {
        id: 'perfect',
        name: 'Perfectionist',
        icon: '👑',
        stat: 'perfect',
        unit: 'Perfect days',
        one: 'Perfect day',
        tiers: [1, 5, 25, 75, 200],
    },
];

/** The achievements earned once */
export const ONE_OFF: OneOffAchievement[] = [
    {
        id: 'perfect-pangram',
        name: 'Flawless',
        icon: '💎',
        desc: 'Find a pangram that uses each letter exactly once.',
    },
    { id: 'opening-act', name: 'Opening Act', icon: '🎬', desc: 'Make a pangram your first word of the day.' },
    { id: 'double-dip', name: 'Double Dip', icon: '🍯', desc: 'Find two or more pangrams in one puzzle.' },
    { id: 'long-8', name: 'Long Stinger', icon: '📏', desc: 'Find a word with 8 or more letters.' },
    { id: 'long-10', name: 'Marathon Word', icon: '🏃', desc: 'Find a word with 10 or more letters.' },
    { id: 'wordsmith', name: 'Wordsmith', icon: '✍️', desc: 'Find 50 words in a single puzzle.' },
    { id: 'quick-buzz', name: 'Quick Buzz', icon: '⚡', desc: 'Find 5 words within 60 seconds.' },
    { id: 'speed-demon', name: 'Speed Demon', icon: '🏎️', desc: 'Reach Genius within 20 minutes of your first word.' },
    { id: 'no-peeking', name: 'No Peeking', icon: '🙈', desc: 'Reach Genius without opening hints.' },
    {
        id: 'full-coverage',
        name: 'Full Coverage',
        icon: '🔤',
        desc: 'Find a word starting with every letter that starts an answer.',
    },
    { id: 'early-bird', name: 'Early Bird', icon: '🌅', desc: 'Find a word between 4am and 7am.' },
    { id: 'night-owl', name: 'Night Owl', icon: '🦉', desc: 'Find a word between 11pm and 4am.' },
    {
        id: 'weekend-warrior',
        name: 'Weekend Warrior',
        icon: '🗓️',
        desc: 'Reach Genius on both Saturday and Sunday of the same weekend.',
    },
    { id: 'welcome-back', name: 'Welcome Back', icon: '👋', desc: 'Return to play after a week or more away.' },
    { id: 'guest-puzzle', name: 'Guest Puzzle', icon: '📬', desc: 'Play an imported puzzle.' },
    { id: 'look-back', name: 'Look Back', icon: '🔍', desc: "Check yesterday's answers." },
];
