import { INVITE_CODE_LENGTH } from '../../src/typescript/data/family';
import {
    formatInviteLink,
    inviteCodeFromBytes,
    newInviteCode,
    parseInviteLink,
} from '../../src/typescript/gamelogic/invites';

/**
 * Tests for invite codes and links.
 */

describe('invite codes', () => {
    it('are the right length, letters and digits only, and different each time', () => {
        const a = newInviteCode();
        const b = newInviteCode();
        expect(a).toHaveLength(INVITE_CODE_LENGTH);
        expect(a).toMatch(/^[A-Za-z0-9]+$/);
        expect(a).not.toBe(b);
    });

    it('skip bytes that would make some characters more likely', () => {
        const bytes = new Uint8Array([248, 255, 0, 61, 62, 247]);
        expect(inviteCodeFromBytes(bytes)).toBe('A9A9');
    });
});

describe('invite links', () => {
    it('round-trip', () => {
        const link = formatInviteLink('https://me.github.io/buzz-off/', {
            fid: '-Nabc_12',
            code: 'Code1234567890abcdef',
        });
        expect(link).toBe('https://me.github.io/buzz-off/#join=-Nabc_12:Code1234567890abcdef');
        expect(parseInviteLink(link)).toEqual({ fid: '-Nabc_12', code: 'Code1234567890abcdef' });
        expect(parseInviteLink('join=-Nabc_12:Code1234567890abcdef')).toEqual({
            fid: '-Nabc_12',
            code: 'Code1234567890abcdef',
        });
    });

    it('rejects other text', () => {
        expect(parseInviteLink('https://example.com/')).toBeNull();
        expect(parseInviteLink('nyt=v1;c:a')).toBeNull();
        expect(parseInviteLink('')).toBeNull();
    });
});
