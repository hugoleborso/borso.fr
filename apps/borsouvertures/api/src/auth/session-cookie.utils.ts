import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  buildOperatorSessionPayload,
  judgeOperatorSession,
  type KnownCredentialEpoch,
  type OperatorSessionVerdict,
  parseOperatorSessionPayload,
} from './operator-session.core';

const SESSION_TTL_DAYS = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;

export const SESSION_COOKIE_NAME = 'borsouvertures_session';
export const SESSION_TTL_MS =
  SESSION_TTL_DAYS *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND;
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_MS / MILLISECONDS_PER_SECOND;

const COOKIE_SEPARATOR = '.';
const SIGNING_KEY_ENCODING = 'base64';

export type SessionCookieVerdict =
  | OperatorSessionVerdict
  | 'missing'
  | 'malformed'
  | 'bad-signature'
  | 'auth-not-bootstrapped';

export interface SessionCookieFacts {
  readonly cookieValue: string | undefined;
  readonly signingKey: string | null;
  readonly credential: KnownCredentialEpoch | null;
  readonly nowMillis: number;
}

function sign(payloadEncoded: string, signingKey: string): Buffer {
  return createHmac('sha256', Buffer.from(signingKey, SIGNING_KEY_ENCODING))
    .update(payloadEncoded)
    .digest();
}

export function buildSessionCookie(
  signingKey: string,
  credential: KnownCredentialEpoch,
  nowMillis: number,
): string {
  const session = buildOperatorSessionPayload(credential, nowMillis, SESSION_TTL_MS);
  const payloadEncoded = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = sign(payloadEncoded, signingKey).toString('base64url');
  return `${payloadEncoded}${COOKIE_SEPARATOR}${signature}`;
}

function isSignedBy(payloadEncoded: string, signatureEncoded: string, signingKey: string): boolean {
  const expected = sign(payloadEncoded, signingKey);
  const provided = Buffer.from(signatureEncoded, 'base64url');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// @FollowsBlueprint utils-pure-module
export function judgeSessionCookie(facts: SessionCookieFacts): SessionCookieVerdict {
  if (facts.signingKey === null) return 'auth-not-bootstrapped';
  if (facts.cookieValue === undefined) return 'missing';
  const separatorIndex = facts.cookieValue.indexOf(COOKIE_SEPARATOR);
  if (separatorIndex === -1) return 'malformed';
  const payloadEncoded = facts.cookieValue.slice(0, separatorIndex);
  const signatureEncoded = facts.cookieValue.slice(separatorIndex + 1);
  if (!isSignedBy(payloadEncoded, signatureEncoded, facts.signingKey)) return 'bad-signature';
  const session = parseOperatorSessionPayload(
    Buffer.from(payloadEncoded, 'base64url').toString('utf8'),
  );
  if (session === null) return 'malformed';
  return judgeOperatorSession(session, facts.credential, facts.nowMillis);
}
