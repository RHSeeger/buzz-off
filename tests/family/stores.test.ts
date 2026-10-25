import * as database from 'firebase/database';
import { addFamilyWord, saveFamilyNyt, setFamilySource } from '../../src/typescript/family/familyDayStore';
import { createFamily, deleteFamily, joinFamily, leaveFamily } from '../../src/typescript/family/families';

/**
 * Tests for the shape of the Firebase writes (the security rules depend on it). Firebase itself is replaced by mocks:
 * these tests check what would be written, not that the rules allow it (that's `npm run check:rules`).
 */

jest.mock('firebase/database', () => ({
    get: jest.fn(),
    onValue: jest.fn(),
    push: jest.fn(() => ({ key: 'FID' })),
    ref: jest.fn((_db: unknown, path?: string) => ({ path: path ?? '' })),
    serverTimestamp: jest.fn(() => 'NOW'),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/typescript/family/firebase', () => ({ database: () => ({}) }));

const db = database as unknown as {
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
};

beforeEach(() => jest.clearAllMocks());

describe('creating, joining and leaving families', () => {
    it('creates a family in one update: meta, the owner as a member, the invite code, and their list', async () => {
        const link = await createFamily('U1', 'Smiths', { name: 'Mom', color: 'red' }, 'America/New_York');
        expect(link.fid).toBe('FID');
        expect(link.code).toMatch(/^[A-Za-z0-9]{20}$/);
        const [where, changes] = db.update.mock.calls[0];
        expect(where).toEqual({ path: '' });
        expect(changes).toEqual({
            'families/FID/meta': { name: 'Smiths', ownerUid: 'U1', timezone: 'America/New_York', createdAt: 'NOW' },
            'families/FID/members/U1': { name: 'Mom', color: 'red', joinedAt: 'NOW' },
            'invites/FID': link.code,
            'users/U1/families/FID': { name: 'Smiths', joinedAt: 'NOW' },
        });
    });

    it('joins with the invite code in the member record, then adds the family to the list', async () => {
        const meta = { name: 'Smiths', ownerUid: 'U1', timezone: 'UTC', createdAt: 1 };
        db.get
            .mockRejectedValueOnce(new Error('permission denied')) // not a member yet
            .mockResolvedValueOnce({ exists: () => true, val: () => meta });
        await expect(joinFamily('U2', { fid: 'F', code: 'CODE' }, { name: 'Kid', color: 'blue' })).resolves.toEqual(
            meta,
        );
        expect(db.set.mock.calls[0]).toEqual([
            { path: 'families/F/members/U2' },
            { name: 'Kid', color: 'blue', joinedAt: 'NOW', inviteCode: 'CODE' },
        ]);
        expect(db.set.mock.calls[1]).toEqual([{ path: 'users/U2/families/F' }, { name: 'Smiths', joinedAt: 'NOW' }]);
    });

    it('leaves and deletes in single updates', async () => {
        await leaveFamily('U2', 'F');
        expect(db.update.mock.calls[0][1]).toEqual({ 'families/F/members/U2': null, 'users/U2/families/F': null });
        await deleteFamily('U1', 'F');
        expect(db.update.mock.calls[1][1]).toEqual({
            'families/F/days': null,
            'families/F/members': null,
            'families/F/meta': null,
            'invites/F': null,
            'users/U1/families/F': null,
        });
    });
});

describe('a family day', () => {
    it("the day's first word also locks in the generated puzzle", async () => {
        await addFamilyWord('F', '2026-10-24', 'able', 'U1', true);
        expect(db.update.mock.calls[0][1]).toEqual({
            'families/F/days/2026-10-24/found/able': { by: 'U1', at: 'NOW' },
            'families/F/days/2026-10-24/source': 'generated',
            'families/F/days/2026-10-24/wordlistVersion': 1,
        });
    });

    it('later words only write the word (the rules refuse a source change after the first word)', async () => {
        await addFamilyWord('F', '2026-10-24', 'bale', 'U1', false);
        expect(db.update.mock.calls[0][1]).toEqual({
            'families/F/days/2026-10-24/found/bale': { by: 'U1', at: 'NOW' },
        });
    });

    it('only touches the NYT fields for a family with the NYT import', async () => {
        await setFamilySource('F', 'D', 'generated', false);
        expect(Object.keys(db.update.mock.calls[0][1])).toEqual([
            'families/F/days/D/source',
            'families/F/days/D/wordlistVersion',
        ]);
        await setFamilySource('F', 'D', 'generated', true);
        expect(db.update.mock.calls[1][1]).toMatchObject({
            'families/F/days/D/nyt': null,
            'families/F/days/D/pendingNyt': null,
        });
    });

    it('loads an imported puzzle, choosing it and clearing the pending flag together', async () => {
        await saveFamilyNyt(
            'F',
            'D',
            { printDate: 'D', center: 'a', outer: ['b', 'c', 'd', 'e', 'f', 'g'], pangrams: ['x'], answers: ['x'] },
            'U1',
        );
        const changes = db.update.mock.calls[0][1];
        expect(changes['families/F/days/D/source']).toBe('nyt');
        expect(changes['families/F/days/D/pendingNyt']).toBeNull();
        expect(changes['families/F/days/D/nyt']).toMatchObject({ outer: 'bcdefg', loadedBy: 'U1', loadedAt: 'NOW' });
    });
});
