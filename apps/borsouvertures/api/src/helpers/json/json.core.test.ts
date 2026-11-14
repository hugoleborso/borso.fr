import { describe, expect, it } from 'vitest';
import { parseJsonOrNull } from './json.core';

// @FollowsBlueprint test-pure-unit
describe('parseJsonOrNull', () => {
  it('parses a JSON document', () => {
    expect(parseJsonOrNull('{"epoch":1}')).toEqual({ epoch: 1 });
  });

  it('answers null for text that is not JSON', () => {
    expect(parseJsonOrNull('{epoch')).toBeNull();
  });
});
