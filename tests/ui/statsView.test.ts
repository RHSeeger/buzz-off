import { lifetimeStats } from '../../src/typescript/gamelogic/stats';
import { closeModal } from '../../src/typescript/ui/modal';
import { showStats } from '../../src/typescript/ui/statsView';

/**
 * Tests for the Stats screen's table of today's family members.
 */

/** Today's shares: the player (kid) and Mom */
const team = [
    { uid: 'mom', name: 'Mom', color: 'red', points: 12, words: 3, pangrams: 1, longest: 'gambled' },
    { uid: 'kid', name: 'Kid', color: 'blue', points: 5, words: 2, pangrams: 0, longest: 'bagel' },
];

/**
 * Opens the Stats screen for a family.
 *
 * @param showLongest - Whose longest word to show
 */
function open(showLongest?: (uid: string) => boolean): void {
    showStats({
        scopes: [{ scope: { kind: 'family', fid: 'f', name: 'Smiths' }, label: 'Me, with Smiths' }],
        initial: 0,
        dataFor: () => ({ stats: lifetimeStats({}, '2026-10-25'), today: null, unlocked: {}, team, showLongest }),
    });
}

/**
 * Returns the members table's "Longest" column.
 *
 * @returns Each row's longest word, as shown
 */
const longestColumn = (): (string | null)[] =>
    [...document.querySelectorAll('.member-table tbody tr')].map((r) => r.lastElementChild?.textContent ?? null);

beforeEach(() => {
    document.body.innerHTML = '<div id="modal-root"></div><div id="toasts"></div>';
});

afterEach(() => closeModal());

describe("today's members table", () => {
    it('shows every longest word', () => {
        open();
        expect(longestColumn()).toEqual(['Gambled', 'Bagel']);
    });

    it("shows others' longest words only as their length while they are hidden", () => {
        open((uid) => uid === 'kid');
        expect(longestColumn()).toEqual(['7 letters', 'Bagel']);
    });
});
