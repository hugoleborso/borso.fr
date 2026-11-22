import { describe, expect, it } from 'vitest';
import { selectAllowedOrigin } from './allowed-origin.core';

const SITE = 'https://skull-king-pr-1.preview.borso.fr';

// @FollowsBlueprint test-pure-unit
describe('selectAllowedOrigin', () => {
  it('lets the site send its session cookie to the API', () => {
    expect(selectAllowedOrigin(SITE, SITE)).toBe(SITE);
  });

  it('refuses any other origin, so no other page can read a signed-in player', () => {
    expect(selectAllowedOrigin('https://attacker.example', SITE)).toBeNull();
  });

  it('refuses every origin when no site origin is configured', () => {
    expect(selectAllowedOrigin(SITE, null)).toBeNull();
  });
});
