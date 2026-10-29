import { describe, expect, it } from 'vitest';
import { isAcceptedRedirectUri } from '../oauth/redirect-uri.core';
import { SEED_ASSISTANT_GRANT } from './test-seed-assistant-grant.core';
import { SEED_MEMBERS } from './test-seed-fixture.core';

// @FollowsBlueprint test-pure-unit
describe('the seeded assistant grant', () => {
  it('belongs to a seeded member and names a loopback address the server accepts', () => {
    const memberNames = SEED_MEMBERS.map((member) => member.firstName);
    expect(memberNames).toContain(SEED_ASSISTANT_GRANT.memberFirstName);
    expect(isAcceptedRedirectUri(SEED_ASSISTANT_GRANT.redirectUri)).toBe(true);
    expect(SEED_ASSISTANT_GRANT.lastUsedMinutesAgo).toBeGreaterThan(0);
  });
});
