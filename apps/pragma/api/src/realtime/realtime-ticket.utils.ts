import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

export const REALTIME_TICKET_TTL_MS = 60 * 1000;

const TICKET_PURPOSE = 'realtime-ticket';
const TICKET_SEPARATOR = '.';

const realtimeTicketPayloadSchema = z
  .object({
    purpose: z.literal(TICKET_PURPOSE),
    memberId: z.guid(),
    expiresAt: z.number(),
  })
  .strict();

export type RealtimeTicketVerdict =
  | { readonly ok: true; readonly memberId: string }
  | { readonly ok: false; readonly reason: 'malformed' | 'bad-signature' | 'expired' };

function signForTicket(payloadEncoded: string, hmacKey: Buffer): Buffer {
  return createHmac('sha256', hmacKey)
    .update(`${TICKET_PURPOSE}${TICKET_SEPARATOR}${payloadEncoded}`)
    .digest();
}

// @FollowsBlueprint utils-pure-module
export function buildRealtimeTicket(hmacKey: Buffer, memberId: string, nowMillis: number): string {
  const ticketClaims = {
    purpose: TICKET_PURPOSE,
    memberId,
    expiresAt: nowMillis + REALTIME_TICKET_TTL_MS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(ticketClaims)).toString('base64url');
  const signature = signForTicket(payloadEncoded, hmacKey).toString('base64url');
  return `${payloadEncoded}${TICKET_SEPARATOR}${signature}`;
}

export function verifyRealtimeTicket(
  ticket: string,
  hmacKey: Buffer,
  nowMillis: number,
): RealtimeTicketVerdict {
  const separatorIndex = ticket.indexOf(TICKET_SEPARATOR);
  if (separatorIndex === -1) return { ok: false, reason: 'malformed' };
  const payloadEncoded = ticket.slice(0, separatorIndex);
  const providedSignature = Buffer.from(ticket.slice(separatorIndex + 1), 'base64url');
  const expectedSignature = signForTicket(payloadEncoded, hmacKey);
  const isSignatureValid =
    providedSignature.length === expectedSignature.length &&
    timingSafeEqual(providedSignature, expectedSignature);
  if (!isSignatureValid) return { ok: false, reason: 'bad-signature' };
  const claims = realtimeTicketPayloadSchema.safeParse(
    parseJsonOrNull(Buffer.from(payloadEncoded, 'base64url').toString('utf8')),
  );
  if (!claims.success) return { ok: false, reason: 'malformed' };
  if (nowMillis >= claims.data.expiresAt) return { ok: false, reason: 'expired' };
  return { ok: true, memberId: claims.data.memberId };
}
