import { describe, expect, it } from 'vitest';
import { parseJsonOrNull } from './json.core';

// @FollowsBlueprint test-pure-unit
describe('parseJsonOrNull', () => {
  it('reads valid JSON back', () => {
    expect(parseJsonOrNull('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonOrNull('null')).toBeNull();
  });

  it('answers null rather than throwing on anything else', () => {
    expect(parseJsonOrNull('not-json')).toBeNull();
    expect(parseJsonOrNull('')).toBeNull();
  });
});
