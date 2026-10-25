import { ONE_OFF, TIERED, TIER_NAMES } from '../data/achievements';
import type { AchievementContext } from '../types/AchievementContext';
import type { EarnedBadge } from '../types/EarnedBadge';
import type { LifetimeStats } from '../types/LifetimeStats';
import type { TierProgress } from '../types/TierProgress';
import type { TieredAchievement } from '../types/TieredAchievement';
import type { UnlockedAchievements } from '../types/UnlockedAchievements';
import { ACHIEVEMENT_CHECKS } from './achievementChecks';

/**
 * Earning badges: works out which tiered badges and one-off achievements have just been earned, and how far along each
 * tiered badge is.
 */

/**
 * Returns what a tiered badge counts, worded for a number (e.g. "1 word found", "2 words found").
 *
 * @param def - The tiered badge
 * @param n - The number
 * @returns The wording
 */
export function unitFor(def: TieredAchievement, n: number): string {
    return n === 1 ? def.one : def.unit;
}

/**
 * Works out how far along a tiered badge is.
 *
 * @param def - The tiered badge
 * @param stats - The all-time stats (only the badge's stat is read)
 * @returns The current value, the tier reached and the next target
 */
export function tierProgress(def: TieredAchievement, stats: Partial<LifetimeStats>): TierProgress {
    const value = (stats[def.stat] as number | undefined) ?? 0;
    let tier = -1;
    def.tiers.forEach((t, i) => {
        if (value >= t) tier = i;
    });
    return { value, tier, next: def.tiers[tier + 1] ?? null, tierName: tier >= 0 ? TIER_NAMES[tier] : null };
}

/**
 * Finds the badges that have just been earned, and records them. When several tiers of one badge are earned at once,
 * all are recorded but only the highest is announced.
 *
 * @param ctx - Everything the checks look at
 * @param unlocked - The badges earned so far (newly earned ones are added)
 * @returns The newly earned badges, to announce
 */
export function evaluateAchievements(ctx: AchievementContext, unlocked: UnlockedAchievements): EarnedBadge[] {
    const fresh: EarnedBadge[] = [];
    const now = ctx.now ?? Date.now();
    for (const def of TIERED) {
        const { tier } = tierProgress(def, ctx.stats);
        for (let i = 0; i <= tier; i++) {
            const key = `${def.id}:${i}`;
            if (unlocked[key]) continue;
            unlocked[key] = { at: now, day: ctx.todayKey };
            if (i === tier) {
                fresh.push({
                    key,
                    name: `${def.name} · ${TIER_NAMES[i]}`,
                    icon: def.icon,
                    desc: `${def.tiers[i].toLocaleString()} ${unitFor(def, def.tiers[i])}`,
                });
            }
        }
    }
    for (const def of ONE_OFF) {
        if (unlocked[def.id]) continue;
        let ok = false;
        try {
            ok = ACHIEVEMENT_CHECKS[def.id]?.(ctx) ?? false;
        } catch {
            ok = false;
        }
        if (ok) {
            unlocked[def.id] = { at: now, day: ctx.todayKey };
            fresh.push({ key: def.id, name: def.name, icon: def.icon, desc: def.desc });
        }
    }
    return fresh;
}

/**
 * Returns how many badges there are in all (every tier counts as one).
 *
 * @returns The number of badges
 */
export function achievementCount(): number {
    return TIERED.reduce((n, d) => n + d.tiers.length, 0) + ONE_OFF.length;
}
