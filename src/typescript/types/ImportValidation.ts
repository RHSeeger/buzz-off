import type { ImportedPuzzle } from './ImportedPuzzle';

/**
 * Defines the ImportValidation type: the result of checking imported puzzle data.
 */

/**
 * The result of checking imported puzzle data: the puzzle, or the reason it was rejected.
 */
export type ImportValidation = { ok: true; puzzle: ImportedPuzzle } | { ok: false; reason: string };
