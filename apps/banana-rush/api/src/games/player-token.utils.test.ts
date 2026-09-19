import { describe, expect, it } from 'vitest';
import { hashPlayerToken } from './player-token.utils';

// @FollowsBlueprint test-pure-unit
describe('hashPlayerToken', () => {
  it('answers the same digest for the same token', () => {
    expect(hashPlayerToken('banana')).toBe(hashPlayerToken('banana'));
  });

  it('answers a different digest for a different token', () => {
    expect(hashPlayerToken('banana')).not.toBe(hashPlayerToken('bananb'));
  });

  it('never gives the token itself back', () => {
    expect(hashPlayerToken('banana')).not.toContain('banana');
  });
});
