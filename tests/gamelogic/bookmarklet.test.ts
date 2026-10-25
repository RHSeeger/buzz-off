import vm from 'node:vm';
import { bookmarkletHref, bookmarkletSource } from '../../src/typescript/gamelogic/bookmarklet';
import { parsePayload, validatePayload } from '../../src/typescript/gamelogic/nytImport';

/**
 * Tests for the bookmarklet. Its code is run in a sandbox with a pretend NYT page.
 */

/** What the NYT page has in window.gameData.today (the field names were checked against the real page on 2026-10-24) */
const today = {
    printDate: '2026-10-24',
    centerLetter: 'a',
    outerLetters: ['b', 'd', 'e', 'g', 'l', 'm'],
    validLetters: ['a', 'b', 'd', 'e', 'g', 'l', 'm'],
    pangrams: ['gambled'],
    answers: ['able', 'abed', 'amble', 'gambled'],
};

/**
 * Runs the bookmarklet on a pretend page.
 *
 * @param windowExtras - What the page's window has (e.g. gameData)
 * @param scripts - The text of the page's script tags
 * @returns The addresses it opened, and the alerts it showed
 */
function runBookmarklet(windowExtras: object, scripts: string[] = []): { opened: string[]; alerts: string[] } {
    const opened: string[] = [];
    const alerts: string[] = [];
    const element = () => ({ style: {}, appendChild() {}, remove() {} });
    const sandbox = {
        location: { href: '' },
        navigator: {},
        alert: (m: string) => alerts.push(m),
        document: {
            getElementsByTagName: () => scripts.map((t) => ({ textContent: t })),
            getElementById: () => null,
            createElement: element,
            body: { appendChild() {} },
        },
        window: {
            ...windowExtras,
            open: (u: string) => {
                opened.push(u);
                return {};
            },
        },
    };
    vm.runInNewContext(bookmarkletSource('https://me.github.io/buzz-off/'), sandbox);
    return { opened, alerts };
}

describe('bookmarklet code', () => {
    it('is safe to use as a bookmark address, and is valid JavaScript', () => {
        const src = bookmarkletSource('https://me.github.io/buzz-off/');
        expect(src).not.toContain('#');
        expect(src).not.toContain('%');
        expect(src).not.toContain('\n');
        expect(() => new vm.Script(src)).not.toThrow();
        expect(bookmarkletHref('https://a/b').startsWith('javascript:(function(){')).toBe(true);
        expect(bookmarkletSource('https://a/b%20c#x')).not.toContain('%');
    });
});

describe('running the bookmarklet', () => {
    it('reads window.gameData and opens the game with the puzzle', () => {
        const { opened, alerts } = runBookmarklet({ gameData: { today } });
        expect(alerts).toHaveLength(0);
        expect(opened).toHaveLength(1);
        const [base, payload] = opened[0].split('#nyt=');
        expect(base).toBe('https://me.github.io/buzz-off/');
        expect(validatePayload(parsePayload(payload)).ok).toBe(true);
    });

    it("falls back to reading the page's script tag", () => {
        const script = `window.gameData = ${JSON.stringify({ today, yesterday: { note: "a } brace 'in' a string" } })}`;
        const { opened } = runBookmarklet({}, ['var x = 1;', script]);
        expect(opened).toHaveLength(1);
        expect(validatePayload(parsePayload(opened[0])).ok).toBe(true);
    });

    it('shows an alert when it is not on the puzzle page', () => {
        const { opened, alerts } = runBookmarklet({});
        expect(opened).toHaveLength(0);
        expect(alerts).toHaveLength(1);
    });
});
