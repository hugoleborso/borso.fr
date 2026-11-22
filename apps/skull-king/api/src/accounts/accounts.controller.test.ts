import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  countRows,
  holdGameRow,
  holdWritesToTable,
  runWritersWhileHeld,
  truncateAllTables,
} from '../../../test/database-utils';
import {
  createAGame,
  readError,
  reachRound,
  readGameEnvelope,
  request,
  seatId,
  TABLE_OF_FOUR,
  writeEntry,
} from '../../../test/game-utils';

const issued = { challenges: 0 };

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: () => {
    issued.challenges += 1;
    return Promise.resolve({ challenge: `registration-${issued.challenges}` });
  },
  generateAuthenticationOptions: () => {
    issued.challenges += 1;
    return Promise.resolve({ challenge: `sign-in-${issued.challenges}` });
  },
  verifyRegistrationResponse: (input: { response: { id: string } }) =>
    Promise.resolve({
      verified: true,
      registrationInfo: {
        credential: { id: input.response.id, publicKey: new Uint8Array([1, 2, 3]), counter: 0 },
      },
    }),
  verifyAuthenticationResponse: () =>
    Promise.resolve({ verified: true, authenticationInfo: { newCounter: 1 } }),
}));

const SITE_ORIGIN = 'http://localhost:5178';
const SESSION_COOKIE = /skull_king_session=([^;]*)/u;

const accountSchema = z
  .object({ id: z.string(), name: z.string(), icon: z.string(), color: z.string() })
  .strict();
const accountEnvelopeSchema = z.object({ account: accountSchema.nullable() }).strict();
const optionsEnvelopeSchema = z.object({ options: z.object({ challenge: z.string() }) });
const myGamesSchema = z
  .object({
    games: z.array(
      z
        .object({
          joinCode: z.string(),
          phase: z.string(),
          currentRound: z.number(),
          openedAt: z.iso.datetime(),
          players: z.array(
            z
              .object({
                seat: z.number(),
                icon: z.string(),
                color: z.string(),
                accountId: z.string().nullable(),
              })
              .strict(),
          ),
          myRank: z.number().nullable(),
          winnerSeats: z.array(z.number()),
        })
        .strict(),
    ),
  })
  .strict();

function browserResponse(credentialId: string, challenge: string) {
  const clientDataJSON = Buffer.from(JSON.stringify({ challenge })).toString('base64url');
  return {
    id: credentialId,
    rawId: credentialId,
    type: 'public-key',
    response: { clientDataJSON },
  };
}

function readSessionCookie(response: Response): string {
  const value = SESSION_COOKIE.exec(response.headers.get('set-cookie') ?? '')?.[1];
  if (value === undefined || value.length === 0) throw new Error('no session cookie was set');
  return `skull_king_session=${value}`;
}

async function readAccount(response: Response) {
  const body: unknown = await response.json();
  return accountEnvelopeSchema.parse(body).account;
}

async function askForOptions(path: string, body: unknown = {}): Promise<string> {
  const response = await request('POST', path, body);
  const envelope: unknown = await response.json();
  return optionsEnvelopeSchema.parse(envelope).options.challenge;
}

async function register(credentialId: string, name = 'Hugo') {
  const challenge = await askForOptions('/api/accounts/registration/options', { name });
  const response = await request('POST', '/api/accounts/registration', {
    name,
    icon: 'skull',
    color: 'gold',
    response: browserResponse(credentialId, challenge),
  });
  return { response, cookie: readSessionCookie(response) };
}

function registrationAnswering(challenge: string, credentialId: string, name: string) {
  return async () =>
    await request('POST', '/api/accounts/registration', {
      name,
      icon: 'skull',
      color: 'gold',
      response: browserResponse(credentialId, challenge),
    });
}

const CHALLENGE_LIFETIME_MILLISECONDS = 120_000;
const CHALLENGE_ISSUED_AT = Date.parse('2026-11-22T20:00:00.000Z');

async function readMyGames(cookie: string) {
  const response = await request('GET', '/api/accounts/me/games', undefined, { cookie });
  const body: unknown = await response.json();
  return myGamesSchema.parse(body).games;
}

async function waitForTheClockToMove(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 5);
  });
}

// @FollowsBlueprint test-back-e2e
describe('passkey accounts, end to end', () => {
  beforeAll(() => {
    process.env.WEBAUTHN_RELYING_PARTY_ID = 'localhost';
    process.env.WEBAUTHN_ORIGIN = SITE_ORIGIN;
  });

  afterAll(() => {
    delete process.env.WEBAUTHN_RELYING_PARTY_ID;
    delete process.env.WEBAUTHN_ORIGIN;
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  it('creates an account with a passkey and signs it in with a lasting, cross-site cookie', async () => {
    const { response, cookie } = await register('credential-1');
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(201);
    expect(await readAccount(response)).toMatchObject({
      name: 'Hugo',
      icon: 'skull',
      color: 'gold',
    });
    expect(setCookie).toMatch(/HttpOnly/iu);
    expect(setCookie).toMatch(/Secure/iu);
    expect(setCookie).toMatch(/SameSite=None/iu);
    expect(setCookie).toMatch(/Max-Age=2592000/iu);
    expect(setCookie).toMatch(/Path=\//iu);
    const signedInAccount = await request('GET', '/api/accounts/me', undefined, { cookie });
    expect((await readAccount(signedInAccount))?.name).toBe('Hugo');
  });

  it('answers no account to a guest, and to a cookie it did not sign', async () => {
    await register('credential-1');

    const guest = await request('GET', '/api/accounts/me');
    const forged = await request('GET', '/api/accounts/me', undefined, {
      cookie: 'skull_king_session=forged.signature',
    });

    expect(await readAccount(guest)).toBeNull();
    expect(await readAccount(forged)).toBeNull();
  });

  it('signs in again with the same passkey, asking for no name', async () => {
    const { response: registered } = await register('credential-1');
    const account = await readAccount(registered);
    const challenge = await askForOptions('/api/accounts/sign-in/options');

    const signedIn = await request('POST', '/api/accounts/sign-in', {
      response: browserResponse('credential-1', challenge),
    });
    const signedInAccount = await request('GET', '/api/accounts/me', undefined, {
      cookie: readSessionCookie(signedIn),
    });

    expect(signedIn.status).toBe(200);
    expect((await readAccount(signedInAccount))?.id).toBe(account?.id);
  });

  it('refuses a passkey it does not know, and a challenge it never issued', async () => {
    const challenge = await askForOptions('/api/accounts/sign-in/options');
    const unknown = await request('POST', '/api/accounts/sign-in', {
      response: browserResponse('credential-9', challenge),
    });
    const replayed = await request('POST', '/api/accounts/registration', {
      name: 'Hugo',
      icon: 'skull',
      color: 'gold',
      response: browserResponse('credential-2', 'never-issued'),
    });
    const signInChallenge = await askForOptions('/api/accounts/sign-in/options');
    const wrongKind = await request('POST', '/api/accounts/registration', {
      name: 'Hugo',
      icon: 'skull',
      color: 'gold',
      response: browserResponse('credential-3', signInChallenge),
    });

    expect(unknown.status).toBe(400);
    expect(await readError(unknown)).toBe('passkey-not-verified');
    expect(await readError(replayed)).toBe('passkey-not-verified');
    expect(await readError(wrongKind)).toBe('passkey-not-verified');
  });

  it('refuses a challenge answered once its two minutes are over', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(CHALLENGE_ISSUED_AT);
      const expiring = await askForOptions('/api/accounts/registration/options', { name: 'Hugo' });
      vi.setSystemTime(CHALLENGE_ISSUED_AT + CHALLENGE_LIFETIME_MILLISECONDS);
      const late = await registrationAnswering(expiring, 'credential-1', 'Hugo')();
      const fresh = await askForOptions('/api/accounts/registration/options', { name: 'Hugo' });
      vi.setSystemTime(CHALLENGE_ISSUED_AT + 2 * CHALLENGE_LIFETIME_MILLISECONDS - 1);
      const inTime = await registrationAnswering(fresh, 'credential-2', 'Hugo')();

      expect(late.status).toBe(400);
      expect(await readError(late)).toBe('passkey-not-verified');
      expect(inTime.status).toBe(201);
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers a challenge once when two phones send it at the same instant', async () => {
    await register('credential-1');
    const challenge = await askForOptions('/api/accounts/sign-in/options');
    const signIn = async () =>
      await request('POST', '/api/accounts/sign-in', {
        response: browserResponse('credential-1', challenge),
      });

    const answers = await runWritersWhileHeld(
      holdWritesToTable('webauthn_challenge'),
      signIn,
      signIn,
    );
    const statuses = answers
      .map((answer) => answer.status)
      .toSorted((first, second) => first - second);
    const refused = answers.find((answer) => answer.status !== 200);

    expect(statuses).toEqual([200, 400]);
    expect(refused === undefined ? null : await readError(refused)).toBe('passkey-not-verified');
  });

  it('keeps one session key when the first two sign-ins write it at the same instant', async () => {
    const first = await askForOptions('/api/accounts/registration/options', { name: 'Hugo' });
    const second = await askForOptions('/api/accounts/registration/options', { name: 'Léa' });

    const answers = await runWritersWhileHeld(
      holdWritesToTable('app_secret'),
      registrationAnswering(first, 'credential-1', 'Hugo'),
      registrationAnswering(second, 'credential-2', 'Léa'),
    );
    const accounts = await Promise.all(
      answers.map(
        async (answer) =>
          await readAccount(
            await request('GET', '/api/accounts/me', undefined, {
              cookie: readSessionCookie(answer),
            }),
          ),
      ),
    );

    expect(answers.map((answer) => answer.status)).toEqual([201, 201]);
    expect(new Set(accounts.map((account) => account?.name))).toEqual(new Set(['Hugo', 'Léa']));
    expect(await countRows('SELECT count(*) FROM app_secret', [])).toBe(1);
  });

  it('signs out by clearing the cookie', async () => {
    const { cookie } = await register('credential-1');

    const response = await request('POST', '/api/accounts/sign-out', undefined, { cookie });

    expect(await readAccount(response)).toBeNull();
    expect(response.headers.get('set-cookie')).toMatch(/skull_king_session=;.*Max-Age=0/iu);
  });

  it('refuses the list of games to a guest', async () => {
    const response = await request('GET', '/api/accounts/me/games');

    expect(response.status).toBe(401);
    expect(await readError(response)).toBe('session-required');
  });

  it('lists the games created or opened while signed in, newest first, with my rank', async () => {
    const { cookie } = await register('credential-1');
    const created = await readGameEnvelope(
      await request('POST', '/api/games', { players: TABLE_OF_FOUR }, { cookie }),
    );
    const hugo = seatId(created, 0);
    await request('POST', `/api/games/${created.joinCode}/players/${hugo}/claim`, undefined, {
      cookie,
    });
    await writeEntry(created.joinCode, 1, hugo, { bid: 1, tricks: 0 });
    await writeEntry(created.joinCode, 1, seatId(created, 1), { bid: 0 });
    const openedLater = await createAGame();
    const unseen = await createAGame();
    await waitForTheClockToMove();

    await request('GET', `/api/games/${openedLater.joinCode}`, undefined, { cookie });
    const games = await readMyGames(cookie);

    expect(games.map((game) => game.joinCode)).toEqual([openedLater.joinCode, created.joinCode]);
    expect(games.map((game) => game.joinCode)).not.toContain(unseen.joinCode);
    expect(games[0]?.myRank).toBeNull();
    expect(games.map((game) => game.winnerSeats)).toEqual([[], []]);
    expect(games[1]?.myRank).toBe(4);
    expect(games[1]?.players[0]).toEqual({
      seat: 0,
      icon: 'skull',
      color: 'gold',
      accountId: expect.any(String),
    });
  });

  it('names the winning seat of a finished game in the list', async () => {
    const { cookie } = await register('credential-1');
    const created = await readGameEnvelope(
      await request('POST', '/api/games', { players: TABLE_OF_FOUR }, { cookie }),
    );

    await reachRound(created, 10, 'finished');
    const [finished] = await readMyGames(cookie);

    expect(finished?.phase).toBe('finished');
    expect(finished?.winnerSeats).toEqual([0]);
  });

  it('links a seat to the account, and refuses a seat another account holds', async () => {
    const hugo = await register('credential-1', 'Hugo');
    const lea = await register('credential-2', 'Léa');
    const created = await createAGame();
    const seat = seatId(created, 0);
    const claimPath = `/api/games/${created.joinCode}/players/${seat}/claim`;

    const claimed = await readGameEnvelope(
      await request('POST', claimPath, undefined, { cookie: hugo.cookie }),
    );
    const again = await request('POST', claimPath, undefined, { cookie: hugo.cookie });
    const taken = await request('POST', claimPath, undefined, { cookie: lea.cookie });
    const guest = await request('POST', claimPath);

    expect(claimed.players[0]?.accountId).toBe((await readAccount(hugo.response))?.id);
    expect(claimed.players[1]?.accountId).toBeNull();
    expect(again.status).toBe(200);
    expect(taken.status).toBe(409);
    expect(await readError(taken)).toBe('seat-taken');
    expect(guest.status).toBe(401);
    expect(await readError(guest)).toBe('session-required');
  });

  it('gives a seat to the first of two accounts claiming it at the same instant', async () => {
    const hugo = await register('credential-1', 'Hugo');
    const lea = await register('credential-2', 'Léa');
    const created = await createAGame();
    const seat = seatId(created, 0);
    const claimPath = `/api/games/${created.joinCode}/players/${seat}/claim`;

    const [first, second] = await runWritersWhileHeld(
      holdGameRow(created.joinCode),
      async () => await request('POST', claimPath, undefined, { cookie: hugo.cookie }),
      async () => await request('POST', claimPath, undefined, { cookie: lea.cookie }),
    );
    const hugoId = (await readAccount(hugo.response))?.id ?? '';

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await readError(second)).toBe('seat-taken');
    expect(
      await countRows('SELECT count(*) FROM player WHERE id = $1 AND account_id = $2', [
        seat,
        hugoId,
      ]),
    ).toBe(1);
  });

  it('lets the site, and only the site, send its cookie across origins', async () => {
    const fromSite = await request('GET', '/api/health', undefined, { origin: SITE_ORIGIN });
    const fromElsewhere = await request('GET', '/api/health', undefined, {
      origin: 'https://attacker.example',
    });

    expect(fromSite.headers.get('access-control-allow-origin')).toBe(SITE_ORIGIN);
    expect(fromSite.headers.get('access-control-allow-credentials')).toBe('true');
    expect(fromElsewhere.headers.get('access-control-allow-origin')).toBeNull();
  });
});
