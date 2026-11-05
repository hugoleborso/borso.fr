import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildCookie, verifyCookie } from '../auth/session-cookie.utils';
import {
  buildRealtimeTicket,
  REALTIME_TICKET_TTL_MS,
  verifyRealtimeTicket,
} from './realtime-ticket.utils';

const HMAC_KEY = randomBytes(32);
const OTHER_HMAC_KEY = randomBytes(32);
const NOW = 1_700_000_000_000;
const MEMBER_ID = '11111111-2222-3333-4444-555555555555';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signAsTicket(payloadEncoded: string): string {
  const signature = createHmac('sha256', HMAC_KEY)
    .update(`realtime-ticket.${payloadEncoded}`)
    .digest('base64url');
  return `${payloadEncoded}.${signature}`;
}

// @FollowsBlueprint test-pure-unit
describe('the realtime ticket', () => {
  it('names the member it was minted for while it lives', () => {
    const ticket = buildRealtimeTicket(HMAC_KEY, MEMBER_ID, NOW);
    expect(verifyRealtimeTicket(ticket, HMAC_KEY, NOW + REALTIME_TICKET_TTL_MS - 1)).toStrictEqual({
      ok: true,
      memberId: MEMBER_ID,
    });
  });

  it('lives sixty seconds and not one millisecond more', () => {
    const ticket = buildRealtimeTicket(HMAC_KEY, MEMBER_ID, NOW);
    expect(REALTIME_TICKET_TTL_MS).toBe(60_000);
    expect(verifyRealtimeTicket(ticket, HMAC_KEY, NOW + REALTIME_TICKET_TTL_MS)).toStrictEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('refuses a ticket signed with another key', () => {
    const ticket = buildRealtimeTicket(OTHER_HMAC_KEY, MEMBER_ID, NOW);
    expect(verifyRealtimeTicket(ticket, HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('refuses a ticket whose payload was rewritten after signing', () => {
    const [, signature] = buildRealtimeTicket(HMAC_KEY, MEMBER_ID, NOW).split('.');
    const forged = `${encode({ purpose: 'realtime-ticket', memberId: MEMBER_ID, expiresAt: NOW * 2 })}.${signature ?? ''}`;
    expect(verifyRealtimeTicket(forged, HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('refuses a ticket whose signature was cut short, without throwing', () => {
    const ticket = buildRealtimeTicket(HMAC_KEY, MEMBER_ID, NOW);
    expect(verifyRealtimeTicket(ticket.slice(0, -4), HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('refuses a ticket carrying no separator', () => {
    expect(verifyRealtimeTicket('no-separator', HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('refuses a signed payload that is not a ticket', () => {
    expect(
      verifyRealtimeTicket(signAsTicket(encode({ memberId: MEMBER_ID })), HMAC_KEY, NOW),
    ).toStrictEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(verifyRealtimeTicket(signAsTicket('not-json'), HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('refuses a signed ticket carrying a field the ticket never holds', () => {
    const claims = encode({
      purpose: 'realtime-ticket',
      memberId: MEMBER_ID,
      expiresAt: NOW + 1,
      epoch: 1,
    });
    expect(verifyRealtimeTicket(signAsTicket(claims), HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'malformed',
    });
  });
});

describe('a ticket and a session cookie', () => {
  it('never lets a session cookie open a socket', () => {
    const cookie = buildCookie(HMAC_KEY, NOW, MEMBER_ID, 1);
    expect(verifyRealtimeTicket(cookie, HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('never lets a ticket pass as a session cookie', () => {
    const ticket = buildRealtimeTicket(HMAC_KEY, MEMBER_ID, NOW);
    expect(verifyCookie(ticket, HMAC_KEY, NOW)).toStrictEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });
});
