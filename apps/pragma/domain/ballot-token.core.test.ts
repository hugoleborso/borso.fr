import { describe, expect, it } from 'vitest';
import { BALLOT_TOKEN_HEADER } from './ballot-token.core';

// @FollowsBlueprint test-pure-unit
describe('BALLOT_TOKEN_HEADER', () => {
  it('is a lowercase header name, the form a fetch and a Lambda both read it in', () => {
    expect(BALLOT_TOKEN_HEADER).toBe(BALLOT_TOKEN_HEADER.toLowerCase());
  });
});
