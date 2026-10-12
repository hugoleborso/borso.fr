import { describe, expect, it } from 'vitest';
import { isCountdownUrgent, isTimeUp } from './countdown.core';

// @FollowsBlueprint test-pure-unit
describe('isCountdownUrgent', () => {
  it('is calm while there is plenty of time', () => {
    expect(isCountdownUrgent(30)).toBe(false);
  });

  it('turns urgent at ten seconds', () => {
    expect(isCountdownUrgent(10)).toBe(true);
  });

  it('stays urgent once the time is gone', () => {
    expect(isCountdownUrgent(0)).toBe(true);
  });
});

describe('isTimeUp', () => {
  it('is false while a second remains', () => {
    expect(isTimeUp(1)).toBe(false);
  });

  it('is true at zero', () => {
    expect(isTimeUp(0)).toBe(true);
  });
});
