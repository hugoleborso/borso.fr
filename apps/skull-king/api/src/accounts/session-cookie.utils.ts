import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const SESSION_TTL_DAYS = 30;
const SECONDS_PER_DAY = 86_400;
const MILLISECONDS_PER_SECOND = 1_000;
const COOKIE_SEPARATOR = '.';

export const SESSION_COOKIE_NAME = 'skull_king_session';
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * SECONDS_PER_DAY;
const SESSION_TTL_MILLISECONDS = SESSION_TTL_SECONDS * MILLISECONDS_PER_SECOND;

const sessionPayloadSchema = z.object({
  accountId: z.guid(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function sign(payloadEncoded: string, hmacKey: Buffer): string {
  return createHmac('sha256', hmacKey).update(payloadEncoded).digest('base64url');
}

function parsePayload(payloadEncoded: string): SessionPayload | null {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    const session = sessionPayloadSchema.safeParse(decoded);
    return session.success ? session.data : null;
  } catch {
    return null;
  }
}

function hasValidSignature(payloadEncoded: string, signature: string, hmacKey: Buffer): boolean {
  const expected = Buffer.from(sign(payloadEncoded, hmacKey), 'base64url');
  const provided = Buffer.from(signature, 'base64url');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// @FollowsBlueprint utils-pure-module
export function buildSessionCookie(hmacKey: Buffer, nowMillis: number, accountId: string): string {
  const session: SessionPayload = {
    accountId,
    issuedAt: nowMillis,
    expiresAt: nowMillis + SESSION_TTL_MILLISECONDS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payloadEncoded}${COOKIE_SEPARATOR}${sign(payloadEncoded, hmacKey)}`;
}

export function readSessionAccountId(
  cookieValue: string,
  hmacKey: Buffer,
  nowMillis: number,
): string | null {
  const separatorAt = cookieValue.indexOf(COOKIE_SEPARATOR);
  const payloadEncoded = cookieValue.slice(0, separatorAt);
  const signature = cookieValue.slice(separatorAt + 1);
  if (signature.includes(COOKIE_SEPARATOR)) return null;
  if (!hasValidSignature(payloadEncoded, signature, hmacKey)) return null;
  const session = parsePayload(payloadEncoded);
  if (session === null || nowMillis >= session.expiresAt) return null;
  return session.accountId;
}
