import { describe, expect, it } from 'vitest';
import { buildInvitationUrl, INVITATION_PARAMETER, readInvitedCode } from './invitation.core';

// @FollowsBlueprint test-pure-unit
describe('buildInvitationUrl', () => {
  it('hangs the code off the root address, which every deployment serves', () => {
    expect(buildInvitationUrl('https://banana-rush.borso.fr', 'ULUL')).toBe(
      `https://banana-rush.borso.fr/?${INVITATION_PARAMETER}=ULUL`,
    );
  });

  it('does not double the slash when the origin carries one', () => {
    expect(buildInvitationUrl('https://banana-rush.borso.fr/', 'ULUL')).toBe(
      `https://banana-rush.borso.fr/?${INVITATION_PARAMETER}=ULUL`,
    );
  });
});

describe('readInvitedCode', () => {
  it('answers nothing when the address carries no invitation', () => {
    expect(readInvitedCode(null)).toBeNull();
  });

  it('reads a code a chat application lower-cased on the way', () => {
    expect(readInvitedCode('ulul')).toBe('ULUL');
  });

  it('refuses a value that is not a whole code', () => {
    expect(readInvitedCode('UL')).toBeNull();
    expect(readInvitedCode('ULULU')).toBeNull();
    expect(readInvitedCode('')).toBeNull();
  });
});
