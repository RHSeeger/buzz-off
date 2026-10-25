import { createHive } from '../../src/typescript/ui/hive';

/**
 * Tests for the honeycomb of letter buttons.
 */

describe('createHive', () => {
    it('puts the center letter in the middle, and passes pressed letters on', () => {
        const container = document.createElement('div');
        const pressed: string[] = [];
        const hive = createHive(container, (l) => pressed.push(l));
        hive.setLetters('a', ['b', 'c', 'd', 'e', 'f', 'g']);
        const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
        expect(cells).toHaveLength(7);
        expect(cells[0].classList.contains('center')).toBe(true);
        expect(cells[0].dataset.letter).toBe('a');
        expect(cells.map((c) => c.dataset.letter).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
        cells[0].click();
        expect(pressed).toEqual(['a']);
    });

    it('shuffles only the outer letters', () => {
        jest.useFakeTimers();
        const container = document.createElement('div');
        const hive = createHive(container, () => {});
        hive.setLetters('a', ['b', 'c', 'd', 'e', 'f', 'g']);
        hive.shuffle();
        jest.runAllTimers();
        const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
        expect(cells[0].dataset.letter).toBe('a');
        expect(cells.map((c) => c.dataset.letter).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
        jest.useRealTimers();
    });
});
