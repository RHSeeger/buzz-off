import type { PlayerColor } from '../types/PlayerColor';

/**
 * Constants for family play: the player colors, and name and invite code lengths.
 */

/** The colors players can pick; each has a CSS token (--player-<id>) with a light and a dark value */
export const PLAYER_COLORS: PlayerColor[] = [
    { id: 'red', name: 'Red' },
    { id: 'blue', name: 'Blue' },
    { id: 'green', name: 'Green' },
    { id: 'purple', name: 'Purple' },
    { id: 'orange', name: 'Orange' },
    { id: 'teal', name: 'Teal' },
];

/** The longest a player's name can be */
export const MAX_PLAYER_NAME = 20;

/** The longest a family's name can be */
export const MAX_FAMILY_NAME = 40;

/** How many characters an invite code has */
export const INVITE_CODE_LENGTH = 20;

/** The stats/badges scope key for "all my families together" */
export const ALL_FAMILIES = 'all';
