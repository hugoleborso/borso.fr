import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import { getMembersSortedByFirstName } from '../members/members.service';
import { getAppConfig } from './auth.service';
import type { DatabaseExecutor } from '../database/client';
import {
  deleteCredentialsForMember,
  findCredentialByMemberId,
  findCredentialByUsername,
  insertCredential,
  listCredentials,
  updateCredentialSecret,
} from './credentials.repository';
import { type EnrolmentWindow, selectEnrolmentWindow, suggestUsername } from './enrolment.core';
import { nextSessionEpoch } from './member-session.core';
import { hashIp, readClientIp } from './ip-hash.utils';
import { type BucketStore, isRateLimited, recordAttempt } from './rate-limit.utils';
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
  const bucket = recordAttempt(params.bucketStore.read(ipHash), nowMillis);
  params.bucketStore.write(ipHash, bucket);
  if (isRateLimited(bucket)) return { kind: 'rate-limited' };
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

export interface EnrolmentOffer {
  readonly memberId: string;
  readonly firstName: string;
  readonly suggestedUsername: string;
}

export async function readEnrolmentWindow(): Promise<
  { kind: 'open'; offers: EnrolmentOffer[] } | { kind: 'closed' }
> {
  const [members, credentials] = await Promise.all([
    getMembersSortedByFirstName(),
    listCredentials(),
  ]);
  const window: EnrolmentWindow = selectEnrolmentWindow(
    members.map((member) => ({ memberId: member.id, firstName: member.firstName })),
    credentials.map((credential) => credential.memberId),
  );
  if (window.kind === 'closed') return { kind: 'closed' };
  const taken = credentials.map((credential) => credential.username);
  return {
    kind: 'open',
    offers: window.candidates.map((candidate) => ({
      memberId: candidate.memberId,
      firstName: candidate.firstName,
      suggestedUsername: suggestUsername(candidate.firstName, taken),
    })),
  };
}

export type EnrolOutcome =
  | { kind: 'ok'; session: IssuedSession }
  | { kind: 'enrolment-closed' }
  | { kind: 'invalid-shared-password' }
  | { kind: 'already-enrolled' }
  | { kind: 'unknown-member' }
  | { kind: 'username-taken' }
  | { kind: 'not-bootstrapped' };

export interface EnrolParams {
  readonly memberId: string;
  readonly username: string;
  readonly password: string;
  readonly sharedPassword: string;
  readonly now: Date;
}

export async function enrolMember(params: EnrolParams): Promise<EnrolOutcome> {
  const config = await getAppConfig();
  if (config === null) return { kind: 'not-bootstrapped' };
  const window = await readEnrolmentWindow();
  if (window.kind === 'closed') return { kind: 'enrolment-closed' };
  const isSharedPasswordOk = await argon2Verify({
    password: params.sharedPassword,
    hash: config.passwordHash,
  });
  if (!isSharedPasswordOk) return { kind: 'invalid-shared-password' };
  const offer = window.offers.find((candidate) => candidate.memberId === params.memberId);
  if (offer === undefined) {
    const existing = await findCredentialByMemberId(params.memberId);
    return existing === null ? { kind: 'unknown-member' } : { kind: 'already-enrolled' };
  }
  const takenByAnother = await findCredentialByUsername(params.username);
  if (takenByAnother !== null) return { kind: 'username-taken' };
  const passwordHash = await hashPassword(params.password);
  await insertCredential({
    memberId: params.memberId,
    username: params.username,
    passwordHash,
    sessionEpoch: FIRST_SESSION_EPOCH,
    createdAt: params.now,
  });
  const session = await issueSession(params.memberId, FIRST_SESSION_EPOCH, params.now.getTime());
  if (session === null) return { kind: 'not-bootstrapped' };
  return { kind: 'ok', session };
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
