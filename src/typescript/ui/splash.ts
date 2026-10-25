import { APP_NAME } from '../data/app';
import { RANKS } from '../data/ranks';
import { dayIndex, formatLongDate } from '../gamelogic/dates';
import type { DaySummary } from '../types/DaySummary';
import type { LifetimeStats } from '../types/LifetimeStats';
import { h, svg } from './dom';
import { closeModal, openModal } from './modal';

/**
 * The welcome screen shown on every visit, and the Genius / Perfect celebration.
 */

/** The logo: a honeycomb of 7 hexagons, the center one filled */
const LOGO = `<svg class="logo" viewBox="0 0 120 120" aria-hidden="true">
  <g stroke="currentColor" stroke-width="5" stroke-linejoin="round">
    <polygon class="logo-c" points="38,60 49,41 71,41 82,60 71,79 49,79"/>
    <polygon points="38,22 49,3 71,3 82,22 71,41 49,41" fill="none"/>
    <polygon points="38,98 49,79 71,79 82,98 71,117 49,117" fill="none"/>
    <polygon points="5,41 16,22 38,22 49,41 38,60 16,60" fill="none"/>
    <polygon points="71,41 82,22 104,22 115,41 104,60 82,60" fill="none"/>
    <polygon points="5,79 16,60 38,60 49,79 38,98 16,98" fill="none"/>
    <polygon points="71,79 82,60 104,60 115,79 104,98 82,98" fill="none"/>
  </g></svg>`;

/**
 * Makes the buttons for choosing today's family puzzle: ours or the NYT's, or waiting for someone getting the NYT one.
 *
 * @param choice - The choice to offer
 * @returns The element
 */
function nytButtons(
    choice:
        | { kind: 'choose'; onGenerated: () => void; onNyt: () => void }
        | { kind: 'pending'; byName: string; at: number; onGenerated: () => void },
): HTMLElement {
    const generated = h(
        'button',
        {
            class: 'pill primary big',
            type: 'button',
            'data-autofocus': true,
            onclick: () => {
                closeModal();
                choice.onGenerated();
            },
        },
        choice.kind === 'choose' ? "Play today's puzzle" : 'Play our puzzle instead',
    );
    if (choice.kind === 'pending') {
        const time = new Date(choice.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return h(
            'div',
            { class: 'splash-choice' },
            h('p', {}, `${choice.byName} is loading the NYT puzzle (started ${time}).`),
            h('button', { class: 'pill big', type: 'button', onclick: () => closeModal() }, 'Wait for it'),
            generated,
        );
    }
    return h(
        'div',
        { class: 'splash-choice' },
        generated,
        h(
            'button',
            {
                class: 'pill big',
                type: 'button',
                onclick: () => {
                    closeModal();
                    choice.onNyt();
                },
            },
            "Load today's NYT puzzle",
        ),
        h('p', { class: 'small' }, 'The NYT puzzle needs a quick manual step.'),
    );
}

/**
 * Opens the welcome screen: Play (or Continue), the streak, and how yesterday went. In family play it names the family,
 * and (for a family with the NYT import) offers the choice of today's puzzle, or says who is getting the NYT one.
 *
 * @param options - Today, today's and yesterday's summaries (if played), the all-time stats, the family's name, the NYT
 *   choice, and what the buttons do
 */
export function showSplash(options: {
    todayKey: string;
    today: DaySummary | undefined;
    yesterday: DaySummary | undefined;
    stats: LifetimeStats;
    familyName?: string | null;
    nytChoice?:
        | { kind: 'choose'; onGenerated: () => void; onNyt: () => void }
        | { kind: 'pending'; byName: string; at: number; onGenerated: () => void }
        | null;
    onYesterday: () => void;
}): void {
    const { todayKey, today, yesterday, stats, onYesterday, familyName, nytChoice } = options;
    const started = !!today && today.words > 0;
    openModal({
        title: APP_NAME,
        variant: 'splash',
        content: [
            svg(LOGO),
            h('p', { class: 'splash-tag' }, 'How many words can you make with 7 letters?'),
            started &&
                h(
                    'p',
                    { class: 'splash-progress' },
                    `You're at `,
                    h('b', {}, RANKS[today.rank].name),
                    ` with ${today.words} word${today.words === 1 ? '' : 's'}.`,
                ),
            !!familyName && h('p', { class: 'splash-family' }, `Playing with ${familyName}`),
            nytChoice
                ? nytButtons(nytChoice)
                : h(
                      'button',
                      {
                          class: 'pill primary big',
                          type: 'button',
                          'data-autofocus': true,
                          onclick: () => closeModal(),
                      },
                      started ? 'Continue' : 'Play',
                  ),
            stats.streak > 0 &&
                h(
                    'p',
                    { class: 'splash-streak' },
                    `🔥 ${stats.streak}-day streak`,
                    started ? '' : '. Play today to keep it going!',
                ),
            !!yesterday &&
                h(
                    'div',
                    { class: 'splash-yesterday' },
                    h(
                        'p',
                        {},
                        'Yesterday: ',
                        h('b', {}, RANKS[yesterday.rank].name),
                        ` · ${yesterday.words} of ${yesterday.total} words · ${yesterday.score} pts`,
                    ),
                    h(
                        'button',
                        {
                            class: 'link-btn',
                            type: 'button',
                            onclick: () => {
                                closeModal();
                                onYesterday();
                            },
                        },
                        "See yesterday's answers",
                    ),
                ),
            h('p', { class: 'splash-date' }, formatLongDate(todayKey), h('br'), `No. ${dayIndex(todayKey) + 1}`),
        ],
    });
}

/**
 * Opens the celebration for reaching Genius or Perfect.
 *
 * @param options - The rank reached, the score, how many words were found, whether it was Perfect, and whether the
 *   family reached it (family play)
 */
export function showCelebration(options: {
    rankName: string;
    score: number;
    words: number;
    perfect: boolean;
    family?: boolean;
}): void {
    const { rankName, score, words, perfect, family = false } = options;
    const who = family ? 'Your family' : 'You';
    openModal({
        title: perfect ? 'Perfect!' : `${rankName}!`,
        variant: 'celebrate',
        content: [
            h('div', { class: 'celebrate-burst', 'aria-hidden': 'true' }, perfect ? '👑' : '🧠'),
            h(
                'p',
                { class: 'lead' },
                perfect
                    ? `${who} found every word. All ${words} of them, for ${score} points.`
                    : `${who} reached ${rankName} with ${score} points. Keep going for Perfect!`,
            ),
            h(
                'button',
                { class: 'pill primary', type: 'button', 'data-autofocus': true, onclick: () => closeModal() },
                'Keep playing',
            ),
        ],
    });
}
