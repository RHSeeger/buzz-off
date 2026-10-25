import { APP_NAME } from '../data/app';
import { h } from './dom';
import { openModal } from './modal';

/**
 * The How to Play screen.
 */

/**
 * Opens the How to Play screen.
 */
export function showHelp(): void {
    openModal({
        title: 'How to Play',
        content: [
            h('p', { class: 'lead' }, 'Create words using letters from the hive.'),
            h(
                'ul',
                { class: 'rules' },
                h('li', {}, 'Words must contain at least 4 letters.'),
                h('li', {}, 'Words must include the center letter.'),
                h('li', {}, 'Letters can be used more than once.'),
                h(
                    'li',
                    {},
                    'Our word list leaves out obscure, hyphenated and proper nouns, and the letter S never appears.',
                ),
            ),
            h('h3', {}, 'Score points to increase your rating.'),
            h(
                'ul',
                { class: 'rules' },
                h('li', {}, '4-letter words are worth 1 point each.'),
                h('li', {}, 'Longer words earn 1 point per letter.'),
                h(
                    'li',
                    {},
                    'Each puzzle includes at least one pangram, which uses every letter. These are worth 7 extra points!',
                ),
            ),
            h('h3', {}, 'Keyboard'),
            h('p', {}, 'Type letters, Backspace to delete, Enter to submit, Space to shuffle.'),
            h('h3', {}, 'Badges'),
            h('p', {}, 'Play daily to build streaks and earn badges. Open the trophy to see your stats and badges.'),
            h('p', { class: 'muted small' }, `A new ${APP_NAME} puzzle is released every day at midnight.`),
        ],
    });
}
