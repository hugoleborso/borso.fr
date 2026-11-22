import { randomBytes, randomUUID } from 'node:crypto';
import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import { listMyGames, type Visit } from '../games/games.service';
import { GameError } from '../helpers/errors/game-error.types';
import type { RegistrationInput } from './accounts.schema';
import {
  type AccountRow,
  claimHmacKey,
  findAccount,
  findHmacKey,
  findPasskey,
  insertAccountWithPasskey,
  insertChallenge,
  takeChallenge,
  updatePasskeyCounter,
} from './accounts.repository';
import {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  checkAuthentication,
  checkRegistration,
} from './passkey.adapter';
import { readChallengeFromResponse, readCredentialIdFromResponse } from './passkey.core';
import { buildSessionCookie, readSessionAccountId } from './session-cookie.utils';

export { refuseInvalidInput } from '../helpers/errors/invalid-input.core';

const CHALLENGE_TTL_MILLISECONDS = 120_000;
const HMAC_KEY_BYTES = 32;

export interface AccountView {
  readonly id: string;
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
}

export interface SignedIn {
  readonly account: AccountView;
  readonly cookieValue: string;
}

function describeAccount(account: AccountRow): AccountView {
  return { id: account.id, name: account.name, icon: account.icon, color: account.color };
}

async function loadHmacKey(now: Date): Promise<Buffer> {
  return (await findHmacKey()) ?? (await claimHmacKey(randomBytes(HMAC_KEY_BYTES), now));
}

async function signIn(account: AccountRow, now: Date): Promise<SignedIn> {
  const hmacKey = await loadHmacKey(now);
  return {
    account: describeAccount(account),
    cookieValue: buildSessionCookie(hmacKey, now.getTime(), account.id),
  };
}

async function rememberChallenge(
  options: Record<string, unknown>,
  accountId: string | null,
  now: Date,
): Promise<void> {
  const challenge = readChallengeFromResponse(options);
  if (challenge === null) throw new Error('the passkey options carry no challenge');
  await insertChallenge(
    { challenge, accountId, expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MILLISECONDS) },
    now,
  );
}

async function takeLiveChallenge(response: unknown, now: Date) {
  const clientChallenge = readChallengeFromResponse(response);
  if (clientChallenge === null) throw new GameError('passkey-not-verified');
  const stored = await takeChallenge(clientChallenge);
  if (stored === null || now >= stored.expiresAt) throw new GameError('passkey-not-verified');
  return stored;
}

// @FollowsBlueprint service-orchestration
export async function startRegistration(name: string, now: Date): Promise<Record<string, unknown>> {
  const accountId = randomUUID();
  const options = await buildRegistrationOptions({ accountId, name });
  await rememberChallenge(options, accountId, now);
  return options;
}

export async function finishRegistration(input: RegistrationInput, now: Date): Promise<SignedIn> {
  const stored = await takeLiveChallenge(input.response, now);
  if (stored.accountId === null) throw new GameError('passkey-not-verified');
  const verdict = await checkRegistration({
    response: input.response,
    challenge: stored.challenge,
  });
  if (verdict === null) throw new GameError('passkey-not-verified');
  const account = await insertAccountWithPasskey(
    {
      id: stored.accountId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      createdAt: now,
    },
    {
      credentialId: verdict.credentialId,
      accountId: stored.accountId,
      publicKey: verdict.publicKey,
      counter: verdict.counter,
      createdAt: now,
    },
  );
  return await signIn(account, now);
}

export async function startSignIn(now: Date): Promise<Record<string, unknown>> {
  const options = await buildAuthenticationOptions();
  await rememberChallenge(options, null, now);
  return options;
}

export async function finishSignIn(response: unknown, now: Date): Promise<SignedIn> {
  const stored = await takeLiveChallenge(response, now);
  const credentialId = readCredentialIdFromResponse(response);
  const passkey = credentialId === null ? null : await findPasskey(credentialId);
  if (passkey === null) throw new GameError('passkey-not-verified');
  const verdict = await checkAuthentication({ response, challenge: stored.challenge, passkey });
  if (verdict === null) throw new GameError('passkey-not-verified');
  await updatePasskeyCounter(passkey.credentialId, verdict.counter);
  const account = await findAccount(passkey.accountId);
  if (account === null) throw new GameError('passkey-not-verified');
  return await signIn(account, now);
}

export async function readSessionAccount(
  cookieValue: string | undefined,
  now: Date,
): Promise<string | null> {
  if (cookieValue === undefined) return null;
  const hmacKey = await findHmacKey();
  if (hmacKey === null) return null;
  return readSessionAccountId(cookieValue, hmacKey, now.getTime());
}

export async function readMe(accountId: string | null): Promise<AccountView | null> {
  if (accountId === null) return null;
  const account = await findAccount(accountId);
  return account === null ? null : describeAccount(account);
}

export async function readMyGames(visit: Visit) {
  if (visit.accountId === null) throw new GameError('session-required');
  return await listMyGames(visit.accountId);
}
