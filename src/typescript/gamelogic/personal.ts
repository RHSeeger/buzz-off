import type { DaySummary } from '../types/DaySummary';
import type { FamilyListEntry } from '../types/FamilyListEntry';
import type { History } from '../types/History';
import type { PersonalData } from '../types/PersonalData';
import type { UnlockedAchievements } from '../types/UnlockedAchievements';

/**
 * A player's data saved in Firebase (their families, their history in each family, their badges): reading it, and
 * adding the histories of several families together for the "all families" stats.
 */

/**
 * Returns a value as a plain object, or an empty one.
 *
 * @param v - The value
 * @returns The object
 */
function asObject(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * Reads a day summary saved in Firebase, filling in anything Firebase dropped (it doesn't keep null values).
 *
 * @param v - The saved value
 * @returns The summary, or null if it isn't usable
 */
function readSummary(v: unknown): DaySummary | null {
    const o = asObject(v);
    if (typeof o.words !== 'number' || typeof o.score !== 'number') return null;
    const num = (x: unknown): number => (typeof x === 'number' ? x : 0);
    const numOrNull = (x: unknown): number | null => (typeof x === 'number' ? x : null);
    return {
        score: o.score,
        max: num(o.max),
        words: o.words,
        total: num(o.total),
        pangrams: num(o.pangrams),
        perfectPangrams: num(o.perfectPangrams),
        rank: num(o.rank),
        longest: typeof o.longest === 'string' ? o.longest : '',
        source: o.source === 'nyt' ? 'nyt' : 'generated',
        hints: o.hints === true,
        firstAt: numOrNull(o.firstAt),
        lastAt: numOrNull(o.lastAt),
        geniusAt: numOrNull(o.geniusAt),
    };
}

/**
 * Reads a player's data from Firebase (`users/<uid>`), skipping anything malformed.
 *
 * @param raw - The saved value (null for a new player)
 * @returns The player's data
 */
export function parsePersonalData(raw: unknown): PersonalData {
    const o = asObject(raw);
    const families: FamilyListEntry[] = Object.entries(asObject(o.families))
        .map(([fid, v]) => {
            const f = asObject(v);
            return {
                fid,
                name: typeof f.name === 'string' ? f.name : 'Family',
                joinedAt: typeof f.joinedAt === 'number' ? f.joinedAt : 0,
            };
        })
        .sort((a, b) => a.joinedAt - b.joinedAt);
    const history: Record<string, History> = {};
    for (const [fid, days] of Object.entries(asObject(o.history))) {
        history[fid] = {};
        for (const [day, v] of Object.entries(asObject(days))) {
            const s = readSummary(v);
            if (s) history[fid][day] = s;
        }
    }
    const achievements: Record<string, UnlockedAchievements> = {};
    for (const [scope, v] of Object.entries(asObject(o.achievements))) {
        achievements[scope] = {};
        for (const [key, rec] of Object.entries(asObject(v))) {
            const r = asObject(rec);
            if (typeof r.at === 'number') achievements[scope][key] = { at: r.at, day: String(r.day ?? '') };
        }
    }
    return { families, history, achievements };
}

/**
 * Adds several histories together, day by day: words, points and pangrams are added up, and the day's rank and
 * longest word are the best of them. Used for the "all families" stats.
 *
 * @param histories - The histories (e.g. one per family)
 * @returns The combined history
 */
export function combineHistories(histories: History[]): History {
    const out: History = {};
    for (const h of histories) {
        for (const [day, s] of Object.entries(h)) {
            const prev = out[day];
            if (!prev) {
                out[day] = { ...s };
                continue;
            }
            const minOrNull = (a: number | null, b: number | null): number | null =>
                a == null ? b : b == null ? a : Math.min(a, b);
            out[day] = {
                ...prev,
                score: prev.score + s.score,
                max: prev.max + s.max,
                words: prev.words + s.words,
                total: prev.total + s.total,
                pangrams: prev.pangrams + s.pangrams,
                perfectPangrams: prev.perfectPangrams + s.perfectPangrams,
                rank: Math.max(prev.rank, s.rank),
                longest: s.longest.length > prev.longest.length ? s.longest : prev.longest,
                hints: prev.hints || s.hints,
                firstAt: minOrNull(prev.firstAt, s.firstAt),
                lastAt: Math.max(prev.lastAt ?? 0, s.lastAt ?? 0) || null,
                geniusAt: minOrNull(prev.geniusAt, s.geniusAt),
            };
        }
    }
    return out;
}
