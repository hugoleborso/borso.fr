import { describe, expect, it } from 'vitest';
import { readFailureCode, UNKNOWN_FAILURE_CODE } from './api-failure.core';

// @FollowsBlueprint test-pure-unit
describe('readFailureCode', () => {
  it('reads the code the API sent', () => {
    expect(readFailureCode({ error: 'game-full' })).toBe('game-full');
  });

  it('falls back when the body has no code', () => {
    expect(readFailureCode({ message: 'oops' })).toBe(UNKNOWN_FAILURE_CODE);
  });

  it('falls back when the body is not an object at all', () => {
    expect(readFailureCode('<html>504</html>')).toBe(UNKNOWN_FAILURE_CODE);
  });

  it('falls back when nothing arrived', () => {
    expect(readFailureCode(null)).toBe(UNKNOWN_FAILURE_CODE);
  });
});
