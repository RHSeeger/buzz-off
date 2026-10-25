import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads the generated data files (the word list and puzzle list) for tests.
 */

/** Where the data files are */
const DATA_DIR = path.join(__dirname, '..', '..', 'src', 'static', 'data');

/**
 * Reads one of the data files.
 *
 * @param name - The file name (e.g. "words.txt")
 * @returns Its contents
 */
export function readDataFile(name: string): string {
    return readFileSync(path.join(DATA_DIR, name), 'utf8');
}
