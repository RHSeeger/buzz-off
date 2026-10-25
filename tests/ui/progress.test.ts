import { makePuzzle } from '../../src/typescript/gamelogic/puzzle';
import { createWordbox, renderProgress } from '../../src/typescript/ui/progress';

/**
 * Tests for the rank progress track and the found-words box.
 */

describe('renderProgress', () => {
    it('shows the rank, a dot per rank, and the score', () => {
        const el = document.createElement('button');
        renderProgress(el, 140, 200);
        expect(el.querySelector('.rank-name')?.textContent).toBe('Genius');
        expect(el.querySelectorAll('.dot')).toHaveLength(10);
        expect(el.querySelectorAll('.dot.reached')).toHaveLength(9);
        expect(el.querySelector('.track-marker')?.textContent).toBe('140');
    });
});

describe('createWordbox', () => {
    const puzzle = makePuzzle({ center: 'a', outer: ['b', 'd', 'e', 'g', 'l', 'm'], answers: ['able', 'gambled'] });

    it('lists the words alphabetically, pangrams in bold, and opens and closes', () => {
        const el = document.createElement('div');
        const box = createWordbox(el);
        box.render(['gambled', 'able'], puzzle, 'able');
        expect(el.querySelector('.wordbox-count')?.textContent).toBe('You have found 2 words');
        const items = [...el.querySelectorAll('li')];
        expect(items.map((li) => li.textContent)).toEqual(['Able', 'Gambled']);
        expect(items[1].classList.contains('pangram')).toBe(true);
        expect(items[0].classList.contains('fresh')).toBe(true);
        el.querySelector<HTMLButtonElement>('.wordbox-head')?.click();
        expect(el.classList.contains('open')).toBe(true);
        box.close();
        expect(el.classList.contains('open')).toBe(false);
    });
});
