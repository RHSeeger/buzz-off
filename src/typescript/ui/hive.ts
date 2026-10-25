import { shuffleInPlace } from '../gamelogic/prng';
import type { Hive } from '../types/Hive';
import { h, restartAnimation, svg } from './dom';

/**
 * The honeycomb of 7 hexagon letter buttons. Button 0 is the center.
 */

/** One hexagon (flat top and bottom); the gaps between them are its stroke, in the background color */
const HEX =
    '<svg class="cell-hex" viewBox="0 0 120 104" aria-hidden="true"><polygon points="0,52 30,0 90,0 120,52 90,104 30,104"/></svg>';

/**
 * Makes the honeycomb's buttons.
 *
 * @param container - Where to put them
 * @param onLetter - Called with a letter when its button is pressed
 * @returns The controls for the honeycomb
 */
export function createHive(container: HTMLElement, onLetter: (letter: string) => void): Hive {
    let center = '';
    let outer: string[] = [];
    const cells = Array.from({ length: 7 }, (_, i) => {
        const letter = h('span', { class: 'cell-letter' });
        const btn = h(
            'button',
            { class: `cell cell-${i}${i === 0 ? ' center' : ''}`, type: 'button' },
            svg(HEX),
            letter,
        );
        btn.addEventListener('click', () => {
            const l = btn.dataset.letter;
            if (l) onLetter(l);
            restartAnimation(btn, 'pressed');
        });
        container.append(btn);
        return { btn, letter };
    });

    /** Puts the current letters on the buttons. */
    function paint(): void {
        const letters = [center, ...outer];
        cells.forEach((c, i) => {
            c.btn.dataset.letter = letters[i];
            c.letter.textContent = letters[i].toUpperCase();
            c.btn.setAttribute('aria-label', `${letters[i].toUpperCase()}${i === 0 ? ', center letter' : ''}`);
        });
    }

    return {
        setLetters(c: string, o: string[]): void {
            center = c;
            outer = shuffleInPlace([...o]);
            paint();
        },
        shuffle(): void {
            container.classList.add('shuffling');
            setTimeout(() => {
                shuffleInPlace(outer);
                paint();
                container.classList.remove('shuffling');
            }, 150);
        },
        flash(letter: string): void {
            const c = cells.find((x) => x.btn.dataset.letter === letter);
            if (c) restartAnimation(c.btn, 'pressed');
        },
        celebrate(): void {
            restartAnimation(container, 'celebrate');
        },
    };
}
