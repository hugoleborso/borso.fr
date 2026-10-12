import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import { getAppConfig } from './auth.service';
import type { DatabaseExecutor } from '../database/client';
import {
  deleteCredentialsForMember,
  findCredentialByMemberId,
  findCredentialByUsername,
  insertCredential,
  updateCredentialSecret,
} from './credentials.repository';
import { nextSessionEpoch } from './member-session.core';
import { hashIp, readClientIp } from './ip-hash.utils';
import {
  type BucketStore,
  isRateLimited,
  MEMBER_LOGIN_BUDGET,
  recordAttempt,
  SHARED_PASSWORD_BUDGET,
} from './rate-limit.utils';
import { buildCookie, SESSION_TTL_MS } from './session-cookie.utils';

const ARGON2_SALT_BYTES = 16;
const ARGON2_HASH_LENGTH = 32;
const ARGON2_MEMORY_KIB = 65536;
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 4;
const FIRST_SESSION_EPOCH = 1;

export async function hashPassword(password: string): Promise<string> {
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

// @FollowsBlueprint repository-owned-transaction
export async function deleteCredentialsOfMember(
  executor: DatabaseExecutor,
  memberId: string,
): Promise<void> {
  await deleteCredentialsForMember(executor, memberId);
}

export async function readCredentialOfMember(memberId: string) {
  return await findCredentialByMemberId(memberId);
}

export interface IssuedSession {
  readonly cookieValue: string;
  readonly expiresAt: string;
}

async function issueSession(
  memberId: string,
  epoch: number,
  nowMillis: number,
): Promise<IssuedSession | null> {
  const config = await getAppConfig();
  if (config === null) return null;
  return {
    cookieValue: buildCookie(config.hmacKey, nowMillis, memberId, epoch),
    expiresAt: new Date(nowMillis + SESSION_TTL_MS).toISOString(),
  };
}

export type MemberLoginOutcome =
  | { kind: 'ok'; session: IssuedSession; memberId: string }
  | { kind: 'rate-limited' }
  | { kind: 'not-bootstrapped' }
  | { kind: 'invalid-credentials' };

export interface AttemptMemberLoginParams {
  readonly username: string;
  readonly password: string;
  readonly forwardedForHeader: string | undefined;
  readonly bucketStore: BucketStore;
  readonly now: Date;
}

// @FollowsBlueprint service-orchestration
export async function attemptMemberLogin(
  params: AttemptMemberLoginParams,
): Promise<MemberLoginOutcome> {
  const ipHash = hashIp(readClientIp(params.forwardedForHeader));
  const nowMillis = params.now.getTime();
  const bucket = recordAttempt(params.bucketStore.read(ipHash), nowMillis, MEMBER_LOGIN_BUDGET);
  params.bucketStore.write(ipHash, bucket);
  if (isRateLimited(bucket, MEMBER_LOGIN_BUDGET)) return { kind: 'rate-limited' };
  const credential = await findCredentialByUsername(params.username);
  if (credential === null) return { kind: 'invalid-credentials' };
  const isPasswordOk = await argon2Verify({
    password: params.password,
    hash: credential.passwordHash,
  });
  if (!isPasswordOk) return { kind: 'invalid-credentials' };
  const session = await issueSession(credential.memberId, credential.sessionEpoch, nowMillis);
  if (session === null) return { kind: 'not-bootstrapped' };
  params.bucketStore.clear(ipHash);
  return { kind: 'ok', session, memberId: credential.memberId };
}

export async function issueSessionForMember(
  memberId: string,
  now: Date,
): Promise<IssuedSession | null> {
  const credential = await findCredentialByMemberId(memberId);
  if (credential === null) return null;
  return await issueSession(memberId, credential.sessionEpoch, now.getTime());
}

export type RecoverPasswordOutcome =
  | { kind: 'ok'; session: IssuedSession; memberId: string }
  | { kind: 'rate-limited' }
  | { kind: 'not-bootstrapped' }
  | { kind: 'invalid-recovery' };

export interface RecoverPasswordParams {
  readonly username: string;
  readonly sharedPassword: string;
  readonly newPassword: string;
  readonly forwardedForHeader: string | undefined;
  readonly bucketStore: BucketStore;
  readonly now: Date;
}

// @FollowsBlueprint service-orchestration
export async function recoverPassword(
  params: RecoverPasswordParams,
): Promise<RecoverPasswordOutcome> {
  const ipHash = hashIp(readClientIp(params.forwardedForHeader));
  const nowMillis = params.now.getTime();
  const bucket = recordAttempt(params.bucketStore.read(ipHash), nowMillis, SHARED_PASSWORD_BUDGET);
  params.bucketStore.write(ipHash, bucket);
  if (isRateLimited(bucket, SHARED_PASSWORD_BUDGET)) return { kind: 'rate-limited' };
  const config = await getAppConfig();
  if (config === null) return { kind: 'not-bootstrapped' };
  const isSharedPasswordOk = await argon2Verify({
    password: params.sharedPassword,
    hash: config.passwordHash,
  });
  if (!isSharedPasswordOk) return { kind: 'invalid-recovery' };
  const credential = await findCredentialByUsername(params.username);
  if (credential === null) return { kind: 'invalid-recovery' };
  const epoch = nextSessionEpoch(credential.sessionEpoch);
  await updateCredentialSecret(credential.memberId, await hashPassword(params.newPassword), epoch);
  const session = await issueSession(credential.memberId, epoch, nowMillis);
  if (session === null) return { kind: 'not-bootstrapped' };
  params.bucketStore.clear(ipHash);
  return { kind: 'ok', session, memberId: credential.memberId };
}

export type CreateCredentialOutcome =
  { kind: 'ok' } | { kind: 'already-enrolled' } | { kind: 'username-taken' };

export async function createCredentialForMember(params: {
  readonly memberId: string;
  readonly username: string;
  readonly password: string;
  readonly now: Date;
}): Promise<CreateCredentialOutcome> {
  const existing = await findCredentialByMemberId(params.memberId);
  if (existing !== null) return { kind: 'already-enrolled' };
  const takenByAnother = await findCredentialByUsername(params.username);
  if (takenByAnother !== null) return { kind: 'username-taken' };
  await insertCredential({
    memberId: params.memberId,
    username: params.username,
    passwordHash: await hashPassword(params.password),
    sessionEpoch: FIRST_SESSION_EPOCH,
    createdAt: params.now,
  });
  return { kind: 'ok' };
}

export type PasswordChangeOutcome =
  | { kind: 'ok'; session: IssuedSession }
  | { kind: 'invalid-password' }
  | { kind: 'unknown-member' }
  | { kind: 'not-bootstrapped' };

export async function changePassword(params: {
  readonly memberId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly now: Date;
}): Promise<PasswordChangeOutcome> {
  const credential = await findCredentialByMemberId(params.memberId);
  if (credential === null) return { kind: 'unknown-member' };
  const isPasswordOk = await argon2Verify({
    password: params.currentPassword,
    hash: credential.passwordHash,
  });
  if (!isPasswordOk) return { kind: 'invalid-password' };
  const epoch = nextSessionEpoch(credential.sessionEpoch);
  await updateCredentialSecret(params.memberId, await hashPassword(params.newPassword), epoch);
  const session = await issueSession(params.memberId, epoch, params.now.getTime());
  if (session === null) return { kind: 'not-bootstrapped' };
  return { kind: 'ok', session };
}
