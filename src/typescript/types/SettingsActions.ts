import type { Theme } from './Theme';

/**
 * Defines the SettingsActions type: what the Menu screen can ask the game to do.
 */

/**
 * What the Menu (and the import screen) can ask the game to do.
 */
export type SettingsActions = {
    /** Change the light/dark choice */
    setTheme(theme: Theme): void;
    /** Load an imported puzzle from the bookmarklet's text */
    importPayload(text: string): void;
    /** Switch today back to the generated puzzle (only before the first word) */
    useGenerated(): void;
    /** Erase all progress, stats and badges */
    resetAll(): void;
};
