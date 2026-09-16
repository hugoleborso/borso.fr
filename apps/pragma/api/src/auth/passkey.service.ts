import { selectDeletionOutcome } from '../helpers/persistence/deletion.core';
import { type IssuedSession, issueSessionForMember } from './credentials.service';
import {
  deleteExpiredChallenges,
  deletePasskey,
  findCredentialByMemberId,
  findPasskeyByCredentialId,
  insertChallenge,
  insertPasskey,
  listPasskeysForMember,
  takeChallenge,
  updatePasskeyCounter,
} from './credentials.repository';
import {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  checkAuthentication,
  checkRegistration,
} from './passkey.adapter';
import { readChallengeFromResponse, readCredentialIdFromResponse } from './passkey.core';

const CHALLENGE_TTL_MS = 120_000;

export interface PasskeySummary {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
}

export async function listPasskeys(memberId: string): Promise<PasskeySummary[]> {
  const passkeys = await listPasskeysForMember(memberId);
  return passkeys.map((passkey) => ({
    id: passkey.id,
    label: passkey.label,
    createdAt: passkey.createdAt.toISOString(),
  }));
}

async function rememberChallenge(
  challenge: string,
  memberId: string | null,
  now: Date,
): Promise<void> {
  await deleteExpiredChallenges(now);
  await insertChallenge({
    challenge,
    memberId,
    expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
  });
}

export type RegistrationOptionsOutcome =
  { kind: 'ok'; options: Record<string, unknown> } | { kind: 'unknown-member' };

// @FollowsBlueprint service-orchestration
export async function startPasskeyRegistration(
  memberId: string,
  now: Date,
): Promise<RegistrationOptionsOutcome> {
  const credential = await findCredentialByMemberId(memberId);
  if (credential === null) return { kind: 'unknown-member' };
  const existing = await listPasskeysForMember(memberId);
  const options = await buildRegistrationOptions({
    memberId,
    username: credential.username,
    existing,
  });
  const challenge = readChallengeFromResponse(options);
  if (challenge === null) return { kind: 'unknown-member' };
  await rememberChallenge(challenge, memberId, now);
  return { kind: 'ok', options };
}

export type RegistrationOutcome = { kind: 'ok' } | { kind: 'verification-failed' };

export async function finishPasskeyRegistration(params: {
  readonly memberId: string;
  readonly label: string;
  readonly response: unknown;
  readonly now: Date;
}): Promise<RegistrationOutcome> {
  const clientChallenge = readChallengeFromResponse(params.response);
  if (clientChallenge === null) return { kind: 'verification-failed' };
  const stored = await takeChallenge(clientChallenge);
  if (stored?.memberId !== params.memberId) return { kind: 'verification-failed' };
  if (params.now >= stored.expiresAt) return { kind: 'verification-failed' };
  const verdict = await checkRegistration({
    response: params.response,
    challenge: stored.challenge,
  });
  if (verdict === null) return { kind: 'verification-failed' };
  await insertPasskey({
    memberId: params.memberId,
    credentialId: verdict.credentialId,
    publicKey: verdict.publicKey,
    signCounter: verdict.signCounter,
    transports: JSON.stringify([]),
    label: params.label,
    createdAt: params.now,
  });
  return { kind: 'ok' };
}

export async function startPasskeyAuthentication(
  now: Date,
): Promise<{ options: Record<string, unknown> } | null> {
  const options = await buildAuthenticationOptions();
  const challenge = readChallengeFromResponse(options);
  if (challenge === null) return null;
  await rememberChallenge(challenge, null, now);
  return { options };
}

export type PasskeyLoginOutcome =
  { kind: 'ok'; session: IssuedSession; memberId: string } | { kind: 'verification-failed' };

export async function finishPasskeyAuthentication(params: {
  readonly response: unknown;
  readonly now: Date;
}): Promise<PasskeyLoginOutcome> {
  const clientChallenge = readChallengeFromResponse(params.response);
  if (clientChallenge === null) return { kind: 'verification-failed' };
  const stored = await takeChallenge(clientChallenge);
  if (stored === null) return { kind: 'verification-failed' };
  if (params.now >= stored.expiresAt) return { kind: 'verification-failed' };
  const credentialId = readCredentialIdFromResponse(params.response);
  if (credentialId === null) return { kind: 'verification-failed' };
  const passkey = await findPasskeyByCredentialId(credentialId);
  if (passkey === null) return { kind: 'verification-failed' };
  const verdict = await checkAuthentication({
    response: params.response,
    challenge: stored.challenge,
    passkey,
  });
  if (verdict === null) return { kind: 'verification-failed' };
  await updatePasskeyCounter(credentialId, verdict.signCounter);
  const session = await issueSessionForMember(passkey.memberId, params.now);
  if (session === null) return { kind: 'verification-failed' };
  return { kind: 'ok', session, memberId: passkey.memberId };
}

export async function removePasskey(memberId: string, passkeyId: string) {
  return selectDeletionOutcome(await deletePasskey(memberId, passkeyId));
}
