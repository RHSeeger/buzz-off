import { showCreateFamily, showFamilyInfo, showJoinFamily, showPlayMode } from '../../src/typescript/ui/familyScreens';
import { closeModal } from '../../src/typescript/ui/modal';

/**
 * Tests for the family play screens (in jsdom; Firebase isn't involved).
 */

beforeEach(() => {
    document.body.innerHTML = '<div id="modal-root"></div><div id="toasts"></div>';
});

afterEach(() => closeModal());

/**
 * Lets pending promises settle.
 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Returns the open modal's buttons with some text.
 *
 * @param text - The text to look for
 * @returns The first matching button
 */
const button = (text: string): HTMLButtonElement => {
    const b = [...document.querySelectorAll<HTMLButtonElement>('#modal-root button')].find((x) =>
        x.textContent?.includes(text),
    );
    if (!b) throw new Error(`No button "${text}"`);
    return b;
};

/** The options showPlayMode needs, with mocks */
const playModeOptions = () => ({
    available: true,
    user: null,
    families: [
        { fid: 'f1', name: 'Smiths', joinedAt: 1 },
        { fid: 'f2', name: 'Joneses', joinedAt: 2 },
    ],
    mode: { kind: 'family', fid: 'f2' } as const,
    onChoose: jest.fn(),
    onFamilyInfo: jest.fn(),
    onCreate: jest.fn(),
    onJoinLink: jest.fn(() => true),
    onSignInWithGoogle: jest.fn(() => Promise.resolve()),
    onSignOut: jest.fn(),
});

describe('showPlayMode', () => {
    it('lists playing alone and each family, marking the current one', () => {
        showPlayMode(playModeOptions());
        const titles = [...document.querySelectorAll('.choice-title')].map((e) => e.textContent);
        expect(titles).toEqual(['Just me', 'Smiths', 'Joneses']);
        expect(document.querySelector('.choice.current .choice-title')?.textContent).toBe('Joneses');
    });

    it('switches when another choice is picked', () => {
        const o = playModeOptions();
        showPlayMode(o);
        button('Smiths').click();
        expect(o.onChoose).toHaveBeenCalledWith({ kind: 'family', fid: 'f1' });
    });

    it('says when family play is not set up', () => {
        showPlayMode({ ...playModeOptions(), available: false, families: [], mode: { kind: 'local' } });
        expect(document.querySelector('#modal-root')?.textContent).toContain("Family play isn't set up");
        expect(() => button('Create a family')).toThrow();
    });

    it('shows an error for a pasted link that is not an invite', () => {
        const o = { ...playModeOptions(), onJoinLink: jest.fn(() => false) };
        showPlayMode(o);
        document.querySelector<HTMLInputElement>('.invite-box input')!.value = 'hello';
        button('Join').click();
        expect(document.querySelector('.form-error')?.textContent).toContain("doesn't look like an invite link");
    });
});

describe('showCreateFamily', () => {
    it("needs the family's name and the player's name, then passes them on", async () => {
        const onCreate = jest.fn(() => Promise.resolve());
        showCreateFamily({ profile: { name: '', color: 'blue' }, onCreate });
        button('Create family').click();
        expect(onCreate).not.toHaveBeenCalled();
        document.querySelector<HTMLInputElement>('#family-name')!.value = '  Smiths  ';
        button('Create family').click();
        expect(onCreate).not.toHaveBeenCalled();
        expect(document.querySelector('.form-error')?.textContent).toBe('Enter your name.');
        document.querySelector<HTMLInputElement>('#create-name')!.value = 'Mom';
        button('Create family').click();
        await settle();
        expect(onCreate).toHaveBeenCalledWith('Smiths', { name: 'Mom', color: 'blue' });
    });

    it('shows the message an action returns', async () => {
        showCreateFamily({ profile: { name: 'Mom', color: 'red' }, onCreate: () => Promise.resolve('Nope') });
        document.querySelector<HTMLInputElement>('#family-name')!.value = 'Smiths';
        button('Create family').click();
        await settle();
        expect(document.querySelector('.form-error')?.textContent).toBe('Nope');
    });
});

describe('showJoinFamily', () => {
    it('joins with the picked name and color, and offers Google sign-in to guests', async () => {
        const onJoin = jest.fn(() => Promise.resolve());
        showJoinFamily({ profile: { name: 'Kid', color: 'red' }, user: null, onJoin, onSignInWithGoogle: jest.fn() });
        document.querySelector<HTMLInputElement>('input[value="green"]')!.checked = true;
        button('Join the family').click();
        await settle();
        expect(onJoin).toHaveBeenCalledWith({ name: 'Kid', color: 'green' });
        expect(button('Sign in with Google first')).toBeTruthy();
    });
});

describe('showFamilyInfo', () => {
    const meta = { name: 'Smiths', ownerUid: 'mom', timezone: 'UTC', createdAt: 1 };
    const members = {
        mom: { name: 'Mom', color: 'red', joinedAt: 1 },
        kid: { name: 'Kid', color: 'blue', joinedAt: 2 },
    };
    const options = (myUid: string) => ({
        meta,
        members,
        myUid,
        inviteLink: () => Promise.resolve('https://x/#join=f:c'),
        onShare: jest.fn(),
        onRegenerate: jest.fn(() => Promise.resolve('https://x/#join=f:d')),
        onRemoveMember: jest.fn(() => Promise.resolve()),
        onSaveProfile: jest.fn(() => Promise.resolve()),
        onLeave: jest.fn(),
        onDelete: jest.fn(),
    });

    it('shows members and the invite link', async () => {
        showFamilyInfo(options('kid'));
        await settle();
        expect(document.querySelector<HTMLInputElement>('.invite-box input')?.value).toBe('https://x/#join=f:c');
        const rows = [...document.querySelectorAll('.member-table tr')].map((r) => r.textContent);
        expect(rows[0]).toContain('Mom');
        expect(rows[1]).toContain('Kid (you)');
    });

    it('only lets the creator remove members, make a new link, or delete the family', () => {
        showFamilyInfo(options('kid'));
        expect(() => button('Remove')).toThrow();
        expect(() => button('Make a new link')).toThrow();
        expect(() => button('Delete the family')).toThrow();
        closeModal();
        showFamilyInfo(options('mom'));
        expect(button('Remove')).toBeTruthy();
        expect(button('Make a new link')).toBeTruthy();
        expect(button('Delete the family')).toBeTruthy();
    });

    it('asks before leaving', () => {
        const o = options('kid');
        showFamilyInfo(o);
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
        button('Leave the family').click();
        expect(o.onLeave).not.toHaveBeenCalled();
        button('Leave the family').click();
        expect(o.onLeave).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});
