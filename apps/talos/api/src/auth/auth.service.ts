import { randomBytes } from 'node:crypto';
import { areSecretsEqual } from '../helpers/crypto/secret-comparison.utils';
import { TalosError, type TalosErrorCode } from '../helpers/errors/talos-error.types';
import { readTalosSecret } from '../helpers/secrets/secrets.setup';
import {
  decidePasskeyRemoval,
  decideRegistrationAccess,
  type PasskeyRemoval,
  type RegistrationAccess,
} from './auth.core';
import { readRelyingParty } from './auth.environment';
import {
  countPasskeys,
  deleteExpiredChallenges,
  deleteExpiredSessions,
  deletePasskey,
  deleteSession,
  findAttempt,
  findPasskeyByCredentialId,
  findPasskeyById,
  findSession,
  insertChallenge,
  insertPasskey,
  insertSession,
  listPasskeys,
  saveAttempt,
  takeChallenge,
  updatePasskeyCounter,
} from './auth.repository';
import { hashIp, readClientIp } from './ip-hash.utils';
import {
  type AuthenticationOptions,
  buildAuthenticationOptions,
  buildRegistrationOptions,
  checkAuthentication,
  checkRegistration,
  type RegistrationOptions,
} from './passkey.adapter';
import {
  type ChallengePurpose,
  isChallengeUsable,
  readChallengeFromResponse,
  readCredentialIdFromResponse,
  readTransportsFromResponse,
} from './passkey.core';
import { AUTHENTICATION_BUDGET, isRateLimited, recordAttempt } from './rate-limit.utils';
import { buildSessionCookie, verifySessionCookie } from './session-cookie.utils';
import { isStoredSessionLive, SESSION_LIFETIME_MS } from './session.core';

export { SESSION_COOKIE_NAME } from './session-cookie.utils';
export { SESSION_LIFETIME_MS } from './session.core';
export { isSecureCookieStage } from './auth.core';
export { readStage } from './auth.environment';

const CHALLENGE_LIFETIME_MINUTES = 5;
const CHALLENGE_LIFETIME_MS = CHALLENGE_LIFETIME_MINUTES * 60 * 1000;
const SESSION_ID_BYTES = 32;

export interface IssuedSession {
  readonly cookieValue: string;
}

export interface RegisteredPasskey {
  readonly id: string;
  readonly createdAt: string;
}

export interface SessionStatus {
  readonly signedIn: boolean;
  readonly registered: boolean;
}

interface RegistrationRequest {
  readonly code?: string | undefined;
  readonly cookie?: string | undefined;
  readonly forwardedFor?: string | undefined;
  readonly now: Date;
}

async function readSessionKey(): Promise<string> {
  const key = await readTalosSecret('session-hmac');
  if (key === undefined) throw new TalosError('not-configured');
  return key;
}

export async function resolveSessionId(
  cookie: string | undefined,
  now: Date,
): Promise<string | null> {
  if (cookie === undefined) return null;
  const verdict = verifySessionCookie(cookie, await readSessionKey(), now.getTime());
  if (!verdict.ok) return null;
  const stored = await findSession(verdict.payload.sessionId);
  return isStoredSessionLive(stored, now.getTime()) ? verdict.payload.sessionId : null;
}

async function issueSession(now: Date): Promise<IssuedSession> {
  const sessionId = randomBytes(SESSION_ID_BYTES).toString('base64url');
  await deleteExpiredSessions(now);
  await insertSession({
    id: sessionId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
  });
  return { cookieValue: buildSessionCookie(await readSessionKey(), now.getTime(), sessionId) };
}

async function consumeAttempt(forwardedFor: string | undefined, now: Date): Promise<void> {
  const ipHash = hashIp(readClientIp(forwardedFor));
  const existing = await findAttempt(ipHash);
  const bucket = recordAttempt(
    existing === null
      ? null
      : { attempts: existing.attempts, windowStartedAt: existing.windowStartedAt.getTime() },
    now.getTime(),
    AUTHENTICATION_BUDGET,
  );
  await saveAttempt({
    ipHash,
    attempts: bucket.attempts,
    windowStartedAt: new Date(bucket.windowStartedAt),
  });
  if (isRateLimited(bucket, AUTHENTICATION_BUDGET)) throw new TalosError('rate-limited');
}

async function rememberChallenge(
  challenge: string,
  purpose: ChallengePurpose,
  now: Date,
): Promise<void> {
  await deleteExpiredChallenges(now);
  await insertChallenge({
    challenge,
    purpose,
    expiresAt: new Date(now.getTime() + CHALLENGE_LIFETIME_MS),
  });
}

async function takeUsableChallenge(
  response: unknown,
  purpose: ChallengePurpose,
  now: Date,
): Promise<string> {
  const challenge = readChallengeFromResponse(response);
  if (challenge === null) throw new TalosError('passkey-verification-failed');
  const stored = await takeChallenge(challenge);
  if (!isChallengeUsable(stored, purpose, now.getTime())) {
    throw new TalosError('passkey-verification-failed');
  }
  return challenge;
}

async function verifyBootstrapCode(request: RegistrationRequest): Promise<void> {
  await consumeAttempt(request.forwardedFor, request.now);
  const expected = await readTalosSecret('bootstrap-code');
  if (expected === undefined) throw new TalosError('not-configured');
  if (!areSecretsEqual(request.code ?? '', expected)) {
    throw new TalosError('invalid-bootstrap-code');
  }
}

function refuseRegistration(): Promise<void> {
  throw new TalosError('registration-closed');
}

const REGISTRATION_GATES: Readonly<
  Record<RegistrationAccess, (request: RegistrationRequest) => Promise<void>>
> = {
  session: async () => {
    await Promise.resolve();
  },
  'bootstrap-code': verifyBootstrapCode,
  closed: refuseRegistration,
};

async function readRegistrationAccess(
  cookie: string | undefined,
  now: Date,
): Promise<RegistrationAccess> {
  const [passkeyCount, sessionId] = await Promise.all([
    countPasskeys(),
    resolveSessionId(cookie, now),
  ]);
  return decideRegistrationAccess({ hasPasskey: passkeyCount > 0, isSignedIn: sessionId !== null });
}

// @FollowsBlueprint service-orchestration
export async function readSessionStatus(
  cookie: string | undefined,
  now: Date,
): Promise<SessionStatus> {
  const [sessionId, passkeyCount] = await Promise.all([
    resolveSessionId(cookie, now),
    countPasskeys(),
  ]);
  return { signedIn: sessionId !== null, registered: passkeyCount > 0 };
}

export async function startRegistration(
  request: RegistrationRequest,
): Promise<RegistrationOptions> {
  const access = await readRegistrationAccess(request.cookie, request.now);
  await REGISTRATION_GATES[access](request);
  const options = await buildRegistrationOptions({
    relyingParty: readRelyingParty(),
    existing: await listPasskeys(),
  });
  await rememberChallenge(options.challenge, 'registration', request.now);
  return options;
}

export async function finishRegistration(params: {
  readonly response: unknown;
  readonly cookie: string | undefined;
  readonly now: Date;
}): Promise<IssuedSession> {
  const challenge = await takeUsableChallenge(params.response, 'registration', params.now);
  const access = await readRegistrationAccess(params.cookie, params.now);
  if (access === 'closed') throw new TalosError('registration-closed');
  const verdict = await checkRegistration({
    relyingParty: readRelyingParty(),
    response: params.response,
    challenge,
  });
  if (verdict === null) throw new TalosError('passkey-verification-failed');
  await insertPasskey({
    credentialId: verdict.credentialId,
    publicKey: verdict.publicKey,
    signCounter: verdict.signCounter,
    transports: JSON.stringify(readTransportsFromResponse(params.response)),
    createdAt: params.now,
  });
  return await issueSession(params.now);
}

export async function startAuthentication(now: Date): Promise<AuthenticationOptions> {
  const options = await buildAuthenticationOptions(readRelyingParty());
  await rememberChallenge(options.challenge, 'authentication', now);
  return options;
}

export async function finishAuthentication(params: {
  readonly response: unknown;
  readonly forwardedFor: string | undefined;
  readonly now: Date;
}): Promise<IssuedSession> {
  await consumeAttempt(params.forwardedFor, params.now);
  const challenge = await takeUsableChallenge(params.response, 'authentication', params.now);
  const credentialId = readCredentialIdFromResponse(params.response) ?? '';
  const passkey = await findPasskeyByCredentialId(credentialId);
  if (passkey === null) throw new TalosError('passkey-verification-failed');
  const verdict = await checkAuthentication({
    relyingParty: readRelyingParty(),
    response: params.response,
    challenge,
    passkey,
  });
  if (verdict === null) throw new TalosError('passkey-verification-failed');
  await updatePasskeyCounter(credentialId, verdict.signCounter);
  return await issueSession(params.now);
}

export async function endSession(cookie: string | undefined, now: Date): Promise<void> {
  const sessionId = await resolveSessionId(cookie, now);
  if (sessionId !== null) await deleteSession(sessionId);
}

export async function listRegisteredPasskeys(): Promise<RegisteredPasskey[]> {
  const passkeys = await listPasskeys();
  return passkeys.map((passkey) => ({
    id: passkey.id,
    createdAt: passkey.createdAt.toISOString(),
  }));
}

const PASSKEY_REMOVAL_FAILURES = {
  'not-found': 'passkey-not-found',
  last: 'last-passkey',
} as const satisfies Record<Exclude<PasskeyRemoval, 'removable'>, TalosErrorCode>;

export async function removePasskey(id: string): Promise<void> {
  const [passkeyCount, passkey] = await Promise.all([countPasskeys(), findPasskeyById(id)]);
  const removal = decidePasskeyRemoval({ passkeyCount, isKnown: passkey !== null });
  if (removal !== 'removable') throw new TalosError(PASSKEY_REMOVAL_FAILURES[removal]);
  await deletePasskey(id);
}
