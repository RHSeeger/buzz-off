import { FIREBASE_CONFIG } from '../src/typescript/data/firebaseConfig';

/**
 * Checks the security rules (database.rules.json) against the real Firebase project, without the emulator (so no
 * Java is needed):
 *
 *   npm run check:rules
 *
 * It signs in three throwaway guest users (owner, member, outsider), creates a test family, tries each thing that
 * should be allowed and each thing that should be refused, prints what happened, then deletes the test family and the
 * three users. Run it after setting up the project, and after any change to the rules (publish them first). It needs
 * src/typescript/data/firebaseConfig.ts filled in, and anonymous sign-in turned on.
 */

/** Firebase's sign-in REST API */
const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

/** The day the test family plays (far in the past, so it can't be mistaken for real play) */
const DAY = '2000-01-02';

/** Firebase's server-timestamp placeholder, in REST form */
const NOW = { '.sv': 'timestamp' };

/**
 * Signs in a new guest user.
 *
 * @returns Their id and token
 */
async function newGuest(): Promise<{ uid: string; token: string }> {
    const res = await fetch(`${AUTH_URL}:signUp?key=${FIREBASE_CONFIG.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
    });
    const body = (await res.json()) as { localId?: string; idToken?: string; error?: { message: string } };
    if (!res.ok || !body.localId || !body.idToken) {
        throw new Error(`Couldn't sign in a guest (${body.error?.message ?? res.status}). Is anonymous sign-in on?`);
    }
    return { uid: body.localId, token: body.idToken };
}

/**
 * Deletes a guest user.
 *
 * @param token - Their token
 */
async function deleteGuest(token: string): Promise<void> {
    await fetch(`${AUTH_URL}:delete?key=${FIREBASE_CONFIG.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
    });
}

/**
 * Reads or writes the database as a user.
 *
 * @param token - The user's token
 * @param method - GET, PUT (set), PATCH (multi-path update) or DELETE
 * @param path - The path ('' for the root)
 * @param body - What to write
 * @returns Whether the rules allowed it, and what came back
 */
async function db(
    token: string,
    method: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
): Promise<{ ok: boolean; value: unknown }> {
    const base = FIREBASE_CONFIG.databaseURL.replace(/\/$/, '');
    const res = await fetch(`${base}/${path}.json?auth=${token}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value: unknown = await res.json().catch(() => null);
    return { ok: res.ok, value };
}

/**
 * Runs the checks.
 */
export async function main(): Promise<void> {
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.databaseURL) {
        console.error('Fill in src/typescript/data/firebaseConfig.ts first (see SETUP-FIREBASE.md).');
        process.exitCode = 1;
        return;
    }
    const owner = await newGuest();
    const member = await newGuest();
    const outsider = await newGuest();
    const fid = `rules-check-${Date.now().toString(36)}`;
    const code = 'RulesCheckCode' + Math.random().toString(36).slice(2, 12);
    const fam = `families/${fid}`;
    const day = `${fam}/days/${DAY}`;
    const results: { name: string; expected: boolean; actual: boolean }[] = [];

    /**
     * Records one check.
     *
     * @param name - What is being tried
     * @param expected - Whether it should be allowed
     * @param attempt - The attempt
     */
    const check = async (name: string, expected: boolean, attempt: Promise<{ ok: boolean }>): Promise<void> => {
        const { ok } = await attempt;
        results.push({ name, expected, actual: ok });
        console.log(`${ok === expected ? 'PASS' : 'FAIL'}  ${expected ? 'allowed' : 'refused'}  ${name}`);
    };

    try {
        await check(
            'Owner creates a family',
            true,
            db(owner.token, 'PATCH', '', {
                [`${fam}/meta`]: { name: 'Rules check', ownerUid: owner.uid, timezone: 'UTC', createdAt: NOW },
                [`${fam}/members/${owner.uid}`]: { name: 'Owner', color: 'red', joinedAt: NOW },
                [`invites/${fid}`]: code,
                [`users/${owner.uid}/families/${fid}`]: { name: 'Rules check', joinedAt: NOW },
            }),
        );
        await check(
            'Outsider takes over the family (writes its meta)',
            false,
            db(outsider.token, 'PUT', `${fam}/meta`, {
                name: 'Mine',
                ownerUid: outsider.uid,
                timezone: 'UTC',
                createdAt: NOW,
            }),
        );
        await check('Outsider reads the family', false, db(outsider.token, 'GET', fam));
        await check('Outsider reads the invite code', false, db(outsider.token, 'GET', `invites/${fid}`));
        await check(
            'Outsider joins with a wrong code',
            false,
            db(outsider.token, 'PUT', `${fam}/members/${outsider.uid}`, {
                name: 'Out',
                color: 'blue',
                joinedAt: NOW,
                inviteCode: 'WrongWrongWrongWrong',
            }),
        );
        await check(
            'Outsider joins without a code',
            false,
            db(outsider.token, 'PUT', `${fam}/members/${outsider.uid}`, { name: 'Out', color: 'blue', joinedAt: NOW }),
        );
        await check(
            'Member joins with the right code',
            true,
            db(member.token, 'PUT', `${fam}/members/${member.uid}`, {
                name: 'Member',
                color: 'blue',
                joinedAt: NOW,
                inviteCode: code,
            }),
        );
        await check('Member reads the family', true, db(member.token, 'GET', fam));
        await check('Member reads the invite code', true, db(member.token, 'GET', `invites/${fid}`));
        await check(
            'Member changes the invite code',
            false,
            db(member.token, 'PUT', `invites/${fid}`, 'MemberMadeCode123456'),
        );
        await check(
            'Member adds someone else as a member',
            false,
            db(member.token, 'PUT', `${fam}/members/${outsider.uid}`, { name: 'X', color: 'red', joinedAt: NOW }),
        );
        await check('Member removes the owner', false, db(member.token, 'DELETE', `${fam}/members/${owner.uid}`));
        await check('Member renames the family', false, db(member.token, 'PATCH', `${fam}/meta`, { name: 'Renamed' }));
        await check(
            'Member changes their own name',
            true,
            db(member.token, 'PATCH', `${fam}/members/${member.uid}`, { name: 'Mem' }),
        );
        await check(
            'Member sets the day to the NYT puzzle (not enabled)',
            false,
            db(member.token, 'PUT', `${day}/source`, 'nyt'),
        );
        await check('Member writes the NYT flag', false, db(member.token, 'PUT', `admin/nytFamilies/${fid}`, true));
        await check(
            'Member credits a word to the owner',
            false,
            db(member.token, 'PUT', `${day}/found/able`, { by: owner.uid, at: NOW }),
        );
        await check(
            'Member finds the first word (and locks the day as generated)',
            true,
            db(member.token, 'PATCH', '', {
                [`${day}/found/able`]: { by: member.uid, at: NOW },
                [`${day}/source`]: 'generated',
                [`${day}/wordlistVersion`]: 1,
            }),
        );
        await check(
            "Owner overwrites the member's word",
            false,
            db(owner.token, 'PUT', `${day}/found/able`, { by: owner.uid, at: NOW }),
        );
        await check(
            'Owner finds another word',
            true,
            db(owner.token, 'PUT', `${day}/found/bale`, { by: owner.uid, at: NOW }),
        );
        await check(
            'Owner changes the puzzle after the first word',
            false,
            db(owner.token, 'PUT', `${day}/source`, 'generated'),
        );
        await check(
            'Member writes a badly formed word',
            false,
            db(member.token, 'PUT', `${day}/found/AB1`, { by: member.uid, at: NOW }),
        );
        await check(
            'Member marks hints used (themselves)',
            true,
            db(member.token, 'PUT', `${day}/hints/${member.uid}`, true),
        );
        await check(
            'Member marks hints used for the owner',
            false,
            db(member.token, 'PUT', `${day}/hints/${owner.uid}`, true),
        );
        await check('Member writes an unknown field', false, db(member.token, 'PUT', `${day}/junk`, 1));
        await check(
            'Outsider writes a word',
            false,
            db(outsider.token, 'PUT', `${day}/found/cable`, { by: outsider.uid, at: NOW }),
        );
        await check("Outsider reads the member's own data", false, db(outsider.token, 'GET', `users/${member.uid}`));
        await check('Member reads their own data', true, db(member.token, 'GET', `users/${member.uid}`));
        await check("Member deletes the family's days", false, db(member.token, 'DELETE', `${fam}/days`));
        await check('Owner makes a new invite code', true, db(owner.token, 'PUT', `invites/${fid}`, code + 'X'));
        await check('Owner removes the member', true, db(owner.token, 'DELETE', `${fam}/members/${member.uid}`));
        await check('Removed member reads the family', false, db(member.token, 'GET', fam));
        await check(
            'Removed member rejoins with the old code',
            false,
            db(member.token, 'PUT', `${fam}/members/${member.uid}`, {
                name: 'Member',
                color: 'blue',
                joinedAt: NOW,
                inviteCode: code,
            }),
        );
        await check(
            'Owner deletes the family',
            true,
            db(owner.token, 'PATCH', '', {
                [`${fam}/days`]: null,
                [`${fam}/members`]: null,
                [`${fam}/meta`]: null,
                [`invites/${fid}`]: null,
                [`users/${owner.uid}`]: null,
            }),
        );
    } finally {
        await db(member.token, 'DELETE', `users/${member.uid}`);
        await Promise.all([owner, member, outsider].map((u) => deleteGuest(u.token)));
    }

    const failed = results.filter((r) => r.expected !== r.actual);
    console.log(`\n${results.length - failed.length} of ${results.length} checks passed.`);
    if (failed.length) {
        console.log('The rules allow or refuse something they should not. Check database.rules.json is published.');
        process.exitCode = 1;
    }
}
