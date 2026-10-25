#!/usr/bin/env node
// Builds data/words.txt, data/puzzles.txt and data/LICENSE-wordlist.txt from SCOWL.
//
//   node tools/build-wordlist.mjs [--size 50] [--scowl path/to/scowl.tar.gz]
//
// Without --scowl, the SCOWL tarball is downloaded once into tools/.cache/.
// Output is deterministic for a given source + settings, and is committed.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { letterMask, bitCount } from '../js/wordlist.js';
import { seededRandom, shuffleInPlace } from '../js/prng.js';
import { scoreWord } from '../js/puzzle.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOWL_VERSION = '2020.12.07';
const SCOWL_URL = `https://sourceforge.net/projects/wordlist/files/SCOWL/${SCOWL_VERSION}/scowl-${SCOWL_VERSION}.tar.gz/download`;
const LEVELS = [10, 20, 35, 40, 50, 55, 60, 70, 80, 95];
const CATEGORIES = ['english-words', 'american-words'];

// Puzzle tuning: keep puzzles that feel neither trivial nor brutal.
export const TUNING = {
  minAnswers: 20,
  maxAnswers: 70,
  maxScore: 320,
  maxPangrams: 4,
  seed: 'buzz-off puzzles v1',
};

// --- filters (exported for tests) -----------------------------------------

export function parseBlocklist(text) {
  return new Set(
    text.split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim().toLowerCase()).filter(Boolean),
  );
}

export function keepWord(word, blocklist) {
  if (!/^[a-z]+$/.test(word)) return false; // lowercase a-z only: no proper nouns, apostrophes, accents
  if (word.length < 4) return false;
  if (word.includes('s')) return false;
  if (bitCount(letterMask(word)) > 7) return false;
  if (blocklist.has(word)) return false;
  return true;
}

export function filterWords(rawWords, blocklist) {
  return [...new Set(rawWords.map((w) => w.trim()).filter((w) => keepWord(w, blocklist)))].sort();
}

// Enumerate every (letter set, center) combination that has a pangram, with stats.
export function candidatePuzzles(words) {
  const byMask = new Map();
  for (const w of words) {
    const m = letterMask(w);
    if (!byMask.has(m)) byMask.set(m, []);
    byMask.get(m).push(w);
  }
  const sets = [...byMask.keys()].filter((m) => bitCount(m) === 7);
  const out = [];
  for (const set of sets) {
    // All words whose mask is a subset of `set`: enumerate submasks.
    const subWords = [];
    for (let sub = set; sub; sub = (sub - 1) & set) {
      const ws = byMask.get(sub);
      if (ws) for (const w of ws) subWords.push([w, sub]);
    }
    const letters = [];
    for (let b = 0; b < 26; b++) if (set & (1 << b)) letters.push(String.fromCharCode(97 + b));
    for (const center of letters) {
      const cb = 1 << (center.charCodeAt(0) - 97);
      let count = 0, score = 0, pangrams = 0;
      for (const [w, m] of subWords) {
        if (!(m & cb)) continue;
        const p = m === set;
        count++;
        score += scoreWord(w, p);
        if (p) pangrams++;
      }
      const outer = letters.filter((l) => l !== center).join('');
      out.push({ line: center + outer, set, count, score, pangrams });
    }
  }
  return out;
}

export function selectPuzzles(cands, tuning = TUNING) {
  const ok = cands.filter(
    (c) => c.count >= tuning.minAnswers && c.count <= tuning.maxAnswers &&
      c.score <= tuning.maxScore && c.pangrams <= tuning.maxPangrams,
  );
  ok.sort((a, b) => (a.line < b.line ? -1 : 1)); // stable order before the seeded shuffle
  const rand = seededRandom(tuning.seed);
  shuffleInPlace(ok, rand);
  // One center per letter set: the same pangrams on two days would feel like a repeat.
  const seen = new Set();
  const picked = [];
  for (const c of ok) {
    if (seen.has(c.set)) continue;
    seen.add(c.set);
    picked.push(c);
  }
  return picked;
}

// --- SCOWL tarball reading ----------------------------------------------------

function* tarEntries(buf) {
  let off = 0;
  let longName = null;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const str = (a, b) => header.subarray(a, b).toString('latin1').replace(/\0.*$/s, '');
    let name = str(0, 100);
    const prefix = str(345, 500);
    if (prefix) name = `${prefix}/${name}`;
    const size = parseInt(str(124, 136).trim() || '0', 8);
    const type = String.fromCharCode(header[156] || 48);
    const data = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = data.toString('latin1').replace(/\0.*$/s, ''); continue; }
    if (longName) { name = longName; longName = null; }
    if (type === '0' || type === '\0') yield { name, data };
  }
}

async function loadScowl(tarPath) {
  const buf = gunzipSync(await readFile(tarPath));
  const files = new Map();
  for (const { name, data } of tarEntries(buf)) files.set(name.replace(/^[^/]+\//, ''), data);
  return files;
}

async function ensureTarball(argPath) {
  if (argPath) return argPath;
  const cacheDir = path.join(ROOT, 'tools', '.cache');
  const file = path.join(cacheDir, `scowl-${SCOWL_VERSION}.tar.gz`);
  try { await access(file); return file; } catch { /* download */ }
  await mkdir(cacheDir, { recursive: true });
  console.log(`Downloading SCOWL ${SCOWL_VERSION}...`);
  const res = await fetch(SCOWL_URL, { headers: { 'User-Agent': 'Wget/1.21' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error('Download was not a gzip file; pass --scowl <path> instead.');
  await writeFile(file, bytes);
  return file;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const size = Number(arg('size', 50));
  const files = await loadScowl(await ensureTarball(arg('scowl')));
  const raw = [];
  for (const cat of CATEGORIES) {
    for (const lvl of LEVELS.filter((l) => l <= size)) {
      const data = files.get(`final/${cat}.${lvl}`);
      if (data) raw.push(...data.toString('latin1').split(/\r?\n/));
    }
  }
  const blocklist = parseBlocklist(await readFile(path.join(ROOT, 'tools', 'blocklist.txt'), 'utf8'));
  const words = filterWords(raw, blocklist);
  const cands = candidatePuzzles(words);
  const puzzles = selectPuzzles(cands);

  await mkdir(path.join(ROOT, 'data'), { recursive: true });
  await writeFile(path.join(ROOT, 'data', 'words.txt'), words.join('\n') + '\n');
  await writeFile(path.join(ROOT, 'data', 'puzzles.txt'), puzzles.map((p) => p.line).join('\n') + '\n');
  const copyright = files.get('Copyright')?.toString('latin1') ?? '';
  await writeFile(
    path.join(ROOT, 'data', 'LICENSE-wordlist.txt'),
    `data/words.txt is derived from SCOWL (Spell Checker Oriented Word Lists) version ${SCOWL_VERSION},\n` +
      `http://wordlist.aspell.net/ - American English, size ${size}, filtered by tools/build-wordlist.mjs.\n` +
      `The original SCOWL copyright notice follows.\n\n${copyright}`,
  );

  const avg = (k) => (puzzles.reduce((s, p) => s + p[k], 0) / puzzles.length).toFixed(1);
  console.log(`size ${size}: ${words.length} words, ${cands.length} candidates, ${puzzles.length} puzzles ` +
    `(~${(puzzles.length / 365).toFixed(1)} years). Avg answers ${avg('count')}, avg max score ${avg('score')}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
