import { describe, expect, it } from 'vitest';
import { isCountdownUrgent, isTimeUp, secondsLeft } from './countdown.core';

const opened = '2026-09-19T12:00:00.000Z';

// @FollowsBlueprint test-pure-unit
describe('secondsLeft', () => {
  it('counts down from the full timer at the moment the round opened', () => {
    expect(secondsLeft(opened, 60, new Date(opened))).toBe(60);
  });

  it('counts the seconds that have passed', () => {
    expect(secondsLeft(opened, 60, new Date('2026-09-19T12:00:20.000Z'))).toBe(40);
  });

  it('stops at zero rather than going negative', () => {
    expect(secondsLeft(opened, 60, new Date('2026-09-19T12:05:00.000Z'))).toBe(0);
  });

  it('answers nothing for a game played without a timer', () => {
    expect(secondsLeft(opened, null, new Date(opened))).toBeNull();
  });

  it('answers nothing while no round is open', () => {
    expect(secondsLeft(null, 60, new Date(opened))).toBeNull();
  });

  it('answers nothing for an opening time it cannot read', () => {
    expect(secondsLeft('some time last tuesday', 60, new Date(opened))).toBeNull();
  });
});

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
