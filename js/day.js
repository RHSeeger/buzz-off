// Daily state for solo play: source choice, found words, locking.
// (Family mode will mirror this shape in Firebase.)

import { WORDLIST_VERSION } from './config.js';
import { getJSON, setJSON } from './storage.js';
import { computeAnswers, decodePuzzleLine, makePuzzle, puzzleLineForDay } from './puzzle.js';

export function newDay(key) {
  return { key, source: null, wordlistVersion: null, nyt: null, found: [], hintsUsed: false, geniusAt: null };
}

export function loadDay(key) {
  const d = getJSON(`day:${key}`);
  return d && Array.isArray(d.found) ? { ...newDay(key), ...d } : newDay(key);
}

export function saveDay(day) {
  setJSON(`day:${day.key}`, day);
}

// The source can only change while nothing has been found.
export function isLocked(day) {
  return day.found.length > 0;
}

export function setSource(day, source, nyt = null) {
  if (isLocked(day)) return false;
  day.source = source;
  day.nyt = source === 'nyt' ? nyt : null;
  day.wordlistVersion = source === 'generated' ? WORDLIST_VERSION : null;
  return true;
}

export function addFound(day, word, at = Date.now()) {
  if (!day.source) setSource(day, 'generated'); // first word locks the day as generated
  day.found.push({ w: word, at });
}

export function puzzleForDay(day, wordlist, puzzleLines) {
  if (day.source === 'nyt' && day.nyt) {
    return makePuzzle({ ...day.nyt, source: 'nyt', printDate: day.nyt.printDate });
  }
  const { center, outer } = decodePuzzleLine(puzzleLineForDay(puzzleLines, day.key));
  return makePuzzle({ center, outer, answers: computeAnswers(wordlist, center, outer) });
}
