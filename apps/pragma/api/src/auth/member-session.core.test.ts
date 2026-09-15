import { describe, expect, it } from 'vitest';
import {
  buildMemberSessionPayload,
  judgeMemberSession,
  nextSessionEpoch,
  parseMemberSessionPayload,
} from './member-session.core';

const MEMBER_ID = '11111111-2222-3333-4444-555555555555';
const NOW = 1_700_000_000_000;
const TTL = 60_000;

// @FollowsBlueprint test-pure-unit
describe('member-session.core', () => {
  it('builds a payload carrying the member, the epoch and the window', () => {
    expect(buildMemberSessionPayload(MEMBER_ID, 3, NOW, TTL)).toEqual({
      memberId: MEMBER_ID,
      epoch: 3,
      issuedAt: NOW,
      expiresAt: NOW + TTL,
    });
  });

  it('round-trips a payload through JSON', () => {
    const session = buildMemberSessionPayload(MEMBER_ID, 1, NOW, TTL);
    expect(parseMemberSessionPayload(JSON.stringify(session))).toEqual(session);
  });

  it('refuses a payload that is not JSON', () => {
    expect(parseMemberSessionPayload('not-json')).toBeNull();
  });

  it('refuses the payload shape issued before accounts existed', () => {
    expect(
      parseMemberSessionPayload(JSON.stringify({ issuedAt: NOW, expiresAt: NOW + TTL })),
    ).toBeNull();
  });

  it('refuses a payload whose member is not an identifier', () => {
    expect(
      parseMemberSessionPayload(
        JSON.stringify({ memberId: 'ada', epoch: 1, issuedAt: NOW, expiresAt: NOW + TTL }),
      ),
    ).toBeNull();
  });

  it('accepts a live session whose epoch matches the credential', () => {
    const session = buildMemberSessionPayload(MEMBER_ID, 2, NOW, TTL);
    expect(judgeMemberSession(session, { memberId: MEMBER_ID, sessionEpoch: 2 }, NOW)).toEqual({
      kind: 'valid',
      memberId: MEMBER_ID,
    });
  });

  it('refuses a session past its expiry', () => {
    const session = buildMemberSessionPayload(MEMBER_ID, 2, NOW, TTL);
    expect(
      judgeMemberSession(session, { memberId: MEMBER_ID, sessionEpoch: 2 }, NOW + TTL),
    ).toEqual({ kind: 'expired' });
  });

  it('refuses a session whose member no longer holds a credential', () => {
    const session = buildMemberSessionPayload(MEMBER_ID, 2, NOW, TTL);
    expect(judgeMemberSession(session, null, NOW)).toEqual({ kind: 'unknown-member' });
  });

  it('refuses a session issued before the password changed', () => {
    const session = buildMemberSessionPayload(MEMBER_ID, 2, NOW, TTL);
    expect(judgeMemberSession(session, { memberId: MEMBER_ID, sessionEpoch: 3 }, NOW)).toEqual({
      kind: 'stale-epoch',
    });
  });

  it('advances the epoch by one', () => {
    expect(nextSessionEpoch(7)).toBe(8);
  });
});
