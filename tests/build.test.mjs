import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { keepWord, filterWords, parseBlocklist, candidatePuzzles, selectPuzzles } from '../tools/build-wordlist.mjs';

const block = parseBlocklist('# comment\nbadword\n  Other  # trailing\n');

test('blocklist parsing', () => {
  assert.deepEqual([...block], ['badword', 'other']);
});

test('word filters', () => {
  assert.ok(keepWord('table', block));
  assert.ok(!keepWord('abc', block), 'too short');
  assert.ok(!keepWord('Paris', block), 'proper noun');
  assert.ok(!keepWord("don't", block), 'apostrophe');
  assert.ok(!keepWord('café', block), 'accent');
  assert.ok(!keepWord('well-being', block), 'hyphen');
  assert.ok(!keepWord('tables', block), 'contains s');
  assert.ok(!keepWord('abcdefgh', block), 'more than 7 distinct letters');
  assert.ok(keepWord('abcdefgabcdefg', block), 'repeats are fine');
  assert.ok(!keepWord('badword', block), 'blocklisted');
  assert.deepEqual(filterWords(['zebra', 'able', 'able ', 'Able', 'ables'], block), ['able', 'zebra']);
});

test('real word list obeys the filters', () => {
  const words = readFileSync(new URL('../data/words.txt', import.meta.url), 'utf8').trim().split('\n');
  const realBlock = parseBlocklist(readFileSync(new URL('../tools/blocklist.txt', import.meta.url), 'utf8'));
  assert.ok(words.length > 10000);
  for (const w of words) assert.ok(keepWord(w, realBlock), w);
  assert.deepEqual([...words].sort(), words, 'sorted');
});

test('candidate puzzles and selection', () => {
  const words = filterWords(['gambled', 'able', 'amble', 'bagel', 'label', 'blade', 'ladle', 'medal', 'gamble', 'bald', 'ball'], new Set());
  const cands = candidatePuzzles(words);
  assert.equal(cands.length, 7); // one letter set x 7 centers
  const a = cands.find((c) => c.line[0] === 'a');
  assert.equal(a.line, 'abdeglm');
  assert.equal(a.pangrams, 1);
  const picked = selectPuzzles(cands, { minAnswers: 1, maxAnswers: 100, maxScore: 1000, maxPangrams: 4, seed: 't' });
  assert.equal(picked.length, 1, 'one center per letter set');
  assert.deepEqual(selectPuzzles(cands, { minAnswers: 1, maxAnswers: 100, maxScore: 1000, maxPangrams: 4, seed: 't' }), picked);
});
