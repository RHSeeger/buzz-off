import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { seededRandom, shuffleInPlace } from '../src/typescript/gamelogic/prng';
import { scoreWord } from '../src/typescript/gamelogic/puzzle';
import { bitCount, letterMask } from '../src/typescript/gamelogic/wordlist';
import type { PuzzleCandidate } from './types/PuzzleCandidate';
import type { PuzzleTuning } from './types/PuzzleTuning';

/**
 * Builds src/static/data/words.txt, puzzles.txt and LICENSE-wordlist.txt from SCOWL.
 *
 *   npm run build:words -- [--size 50] [--scowl path/to/scowl.tar.gz]
 *
 * Without --scowl, the SCOWL tarball is downloaded once into tools/.cache/. The output is the same every time for the
 * same source and settings, and is committed.
 */

/** The project's root directory */
const ROOT = path.resolve(__dirname, '..');

/** Where the output goes */
const DATA_DIR = path.join(ROOT, 'src', 'static', 'data');

/** The SCOWL release used */
const SCOWL_VERSION = '2020.12.07';

/** Where to download it */
const SCOWL_URL = `https://sourceforge.net/projects/wordlist/files/SCOWL/${SCOWL_VERSION}/scowl-${SCOWL_VERSION}.tar.gz/download`;

/** SCOWL's size levels (bigger includes rarer words) */
const LEVELS = [10, 20, 35, 40, 50, 55, 60, 70, 80, 95];

/** The SCOWL word files used: words common to all English, and American-only words */
const CATEGORIES = ['english-words', 'american-words'];

/** The limits for keeping a puzzle */
export const TUNING: PuzzleTuning = {
    minAnswers: 20,
    maxAnswers: 70,
    maxScore: 320,
    maxPangrams: 4,
    seed: 'buzz-off puzzles v1',
};

/**
 * Reads the blocklist file.
 *
 * @param text - The file: one word per line; '#' starts a comment
 * @returns The blocked words, lowercase
 */
export function parseBlocklist(text: string): Set<string> {
    return new Set(
        text
            .split(/\r?\n/)
            .map((l) => l.replace(/#.*/, '').trim().toLowerCase())
            .filter(Boolean),
    );
}

/**
 * Decides whether a word can be an answer: lowercase a-z only (no proper nouns, apostrophes, accents or hyphens),
 * 4+ letters, no 's', at most 7 different letters, and not blocked.
 *
 * @param word - The word
 * @param blocklist - The blocked words
 * @returns True to keep it
 */
export function keepWord(word: string, blocklist: Set<string>): boolean {
    if (!/^[a-z]+$/.test(word)) return false;
    if (word.length < 4) return false;
    if (word.includes('s')) return false;
    if (bitCount(letterMask(word)) > 7) return false;
    return !blocklist.has(word);
}

/**
 * Filters the raw word list down to possible answers.
 *
 * @param rawWords - The raw words (may have spaces around them, and repeats)
 * @param blocklist - The blocked words
 * @returns The answers, sorted, without repeats
 */
export function filterWords(rawWords: string[], blocklist: Set<string>): string[] {
    return [...new Set(rawWords.map((w) => w.trim()).filter((w) => keepWord(w, blocklist)))].sort();
}

/**
 * Lists every possible puzzle: each 7-letter set that some word uses all of, with each of its letters as the center.
 *
 * @param words - The answers
 * @returns The candidates, with their stats
 */
export function candidatePuzzles(words: string[]): PuzzleCandidate[] {
    const byMask = new Map<number, string[]>();
    for (const w of words) {
        const m = letterMask(w);
        const list = byMask.get(m) ?? [];
        list.push(w);
        byMask.set(m, list);
    }
    const sets = [...byMask.keys()].filter((m) => bitCount(m) === 7);
    const out: PuzzleCandidate[] = [];
    for (const set of sets) {
        // Every word whose letters are all in `set`: go through the subsets of its letters
        const subWords: [string, number][] = [];
        for (let sub = set; sub; sub = (sub - 1) & set) {
            for (const w of byMask.get(sub) ?? []) subWords.push([w, sub]);
        }
        const letters: string[] = [];
        for (let b = 0; b < 26; b++) if (set & (1 << b)) letters.push(String.fromCharCode(97 + b));
        for (const center of letters) {
            const cb = 1 << (center.charCodeAt(0) - 97);
            let count = 0;
            let score = 0;
            let pangrams = 0;
            for (const [w, m] of subWords) {
                if (!(m & cb)) continue;
                const p = m === set;
                count++;
                score += scoreWord(w, p);
                if (p) pangrams++;
            }
            out.push({ line: center + letters.filter((l) => l !== center).join(''), set, count, score, pangrams });
        }
    }
    return out;
}

/**
 * Chooses the puzzles to use: keeps the ones within the limits, shuffles them with a fixed seed, and keeps only one
 * center per letter set (the same pangrams on two days would feel like a repeat).
 *
 * @param cands - The candidates
 * @param tuning - The limits
 * @returns The puzzles, in the order they will be played
 */
export function selectPuzzles(cands: PuzzleCandidate[], tuning: PuzzleTuning = TUNING): PuzzleCandidate[] {
    const ok = cands.filter(
        (c) =>
            c.count >= tuning.minAnswers &&
            c.count <= tuning.maxAnswers &&
            c.score <= tuning.maxScore &&
            c.pangrams <= tuning.maxPangrams,
    );
    ok.sort((a, b) => (a.line < b.line ? -1 : 1)); // a fixed order before the seeded shuffle
    shuffleInPlace(ok, seededRandom(tuning.seed));
    const seen = new Set<number>();
    return ok.filter((c) => {
        if (seen.has(c.set)) return false;
        seen.add(c.set);
        return true;
    });
}

/**
 * Reads the regular files out of a tar archive.
 *
 * @param buf - The (uncompressed) archive
 * @returns Each file's path and contents
 */
function tarEntries(buf: Buffer): { name: string; data: Buffer }[] {
    const out: { name: string; data: Buffer }[] = [];
    let off = 0;
    let longName: string | null = null;
    while (off + 512 <= buf.length) {
        const header = buf.subarray(off, off + 512);
        if (header.every((b) => b === 0)) break;
        const str = (a: number, b: number): string => header.subarray(a, b).toString('latin1').replace(/\0.*$/s, '');
        let name = str(0, 100);
        const prefix = str(345, 500);
        if (prefix) name = `${prefix}/${name}`;
        const size = parseInt(str(124, 136).trim() || '0', 8);
        const type = String.fromCharCode(header[156] || 48);
        const data = buf.subarray(off + 512, off + 512 + size);
        off += 512 + Math.ceil(size / 512) * 512;
        if (type === 'L') {
            longName = data.toString('latin1').replace(/\0.*$/s, '');
            continue;
        }
        if (longName) {
            name = longName;
            longName = null;
        }
        if (type === '0' || type === '\0') out.push({ name, data });
    }
    return out;
}

/**
 * Reads the SCOWL tarball.
 *
 * @param tarPath - Where it is
 * @returns Each file's contents, by path within the release (e.g. "final/english-words.10")
 */
async function loadScowl(tarPath: string): Promise<Map<string, Buffer>> {
    const files = new Map<string, Buffer>();
    for (const { name, data } of tarEntries(gunzipSync(await readFile(tarPath)))) {
        files.set(name.replace(/^[^/]+\//, ''), data);
    }
    return files;
}

/**
 * Finds the SCOWL tarball, downloading it into tools/.cache/ the first time.
 *
 * @param argPath - A path given with --scowl, if any
 * @returns Where it is
 */
async function ensureTarball(argPath: string | undefined): Promise<string> {
    if (argPath) return argPath;
    const cacheDir = path.join(ROOT, 'tools', '.cache');
    const file = path.join(cacheDir, `scowl-${SCOWL_VERSION}.tar.gz`);
    try {
        await access(file);
        return file;
    } catch {
        /* not downloaded yet */
    }
    await mkdir(cacheDir, { recursive: true });
    console.log(`Downloading SCOWL ${SCOWL_VERSION}...`);
    const res = await fetch(SCOWL_URL, { headers: { 'User-Agent': 'Wget/1.21' }, redirect: 'follow' });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
        throw new Error('Download was not a gzip file; pass --scowl <path> instead.');
    }
    await writeFile(file, bytes);
    return file;
}

/**
 * Returns a command-line option's value.
 *
 * @param name - The option, without the dashes
 * @returns The value after it, or undefined
 */
function arg(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * Builds the word list, the puzzle list and the license file.
 */
export async function main(): Promise<void> {
    const size = Number(arg('size') ?? 50);
    const files = await loadScowl(await ensureTarball(arg('scowl')));
    const raw: string[] = [];
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

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(path.join(DATA_DIR, 'words.txt'), words.join('\n') + '\n');
    await writeFile(path.join(DATA_DIR, 'puzzles.txt'), puzzles.map((p) => p.line).join('\n') + '\n');
    const copyright = files.get('Copyright')?.toString('latin1') ?? '';
    await writeFile(
        path.join(DATA_DIR, 'LICENSE-wordlist.txt'),
        `data/words.txt is derived from SCOWL (Spell Checker Oriented Word Lists) version ${SCOWL_VERSION},\n` +
            `http://wordlist.aspell.net/ - American English, size ${size}, filtered by tools/build-wordlist.ts.\n` +
            `The original SCOWL copyright notice follows.\n\n${copyright}`,
    );

    const avg = (k: 'count' | 'score'): string => (puzzles.reduce((s, p) => s + p[k], 0) / puzzles.length).toFixed(1);
    console.log(
        `size ${size}: ${words.length} words, ${cands.length} candidates, ${puzzles.length} puzzles ` +
            `(~${(puzzles.length / 365).toFixed(1)} years). Avg answers ${avg('count')}, avg max score ${avg('score')}.`,
    );
}
