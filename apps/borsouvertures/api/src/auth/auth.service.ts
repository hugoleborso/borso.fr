import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import {
  deleteSignInAttempts,
  findOperatorCredential,
  findSigningKey,
  incrementSignInAttempts,
  type OperatorCredential,
} from './auth.repository';
import {
  decideSignIn,
  OPERATOR_CREDENTIAL_ID,
  selectCredentialToVerify,
  type SignInRefused,
  SIGNING_KEY_ID,
} from './operator-session.core';
import { hashClientAddress, isRateLimited, selectWindowFloor } from './rate-limit.utils';
import {
  buildSessionCookie,
  judgeSessionCookie,
  type SessionCookieVerdict,
} from './session-cookie.utils';

export { readClientAddress } from '../helpers/client-address/client-address.environment';
export { isCookieSecure } from './auth.environment';
export { SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from './session-cookie.utils';

const ARGON2_SALT_BYTES = 16;
const ARGON2_HASH_LENGTH = 32;
const ARGON2_MEMORY_KIB = 65536;
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 4;

export async function hashOperatorPassword(password: string): Promise<string> {
  return await argon2id({
    password,
    salt: randomBytes(ARGON2_SALT_BYTES),
    iterations: ARGON2_ITERATIONS,
    parallelism: ARGON2_PARALLELISM,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: 'encoded',
  });
}

async function isPasswordOf(
  credential: OperatorCredential | null,
  password: string,
): Promise<boolean> {
  if (credential === null) return false;
  return await argon2Verify({ password, hash: credential.passwordHash });
}

export interface AttemptSignInParams {
  readonly password: string;
  readonly clientAddress: string;
  readonly now: Date;
}

export type SignInOutcome =
  | { readonly kind: 'signed-in'; readonly cookieValue: string }
  | SignInRefused;

// @FollowsBlueprint service-orchestration
export async function attemptSignIn(params: AttemptSignInParams): Promise<SignInOutcome> {
  const addressHash = hashClientAddress(params.clientAddress);
  const attempt = await incrementSignInAttempts(
    addressHash,
    params.now,
    selectWindowFloor(params.now),
  );
  const isLimited = isRateLimited(attempt.attemptCount);
  const [credential, signingKey] = await Promise.all([
    findOperatorCredential(OPERATOR_CREDENTIAL_ID),
    findSigningKey(SIGNING_KEY_ID),
  ]);
  const decision = decideSignIn({
    isRateLimited: isLimited,
    credential,
    signingKey,
    isPasswordRight: await isPasswordOf(
      selectCredentialToVerify(isLimited, credential),
      params.password,
    ),
  });
  if (decision.kind === 'refused') return decision;
  await deleteSignInAttempts(addressHash);
  return {
    kind: 'signed-in',
    cookieValue: buildSessionCookie(decision.signingKey, decision.credential, params.now.getTime()),
  };
}

// @FollowsBlueprint service-clock-injected
export async function readSessionVerdict(
  cookieValue: string | undefined,
  now: Date,
): Promise<SessionCookieVerdict> {
  const [credential, signingKey] = await Promise.all([
    findOperatorCredential(OPERATOR_CREDENTIAL_ID),
    findSigningKey(SIGNING_KEY_ID),
  ]);
  return judgeSessionCookie({ cookieValue, signingKey, credential, nowMillis: now.getTime() });
}

export async function isOperatorSignedIn(
  cookieValue: string | undefined,
  now: Date,
): Promise<boolean> {
  return (await readSessionVerdict(cookieValue, now)) === 'valid';
}
