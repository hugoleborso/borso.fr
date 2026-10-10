import { describe, expect, it } from 'vitest';
import { hasRoundTimerExpired, secondsLeftInRound } from './round-clock.core';

const opened = '2026-09-19T12:00:00.000Z';
const openedInstant = new Date(opened);

// @FollowsBlueprint test-pure-unit
describe('secondsLeftInRound', () => {
  it('counts down from the full timer at the moment the round opened', () => {
    expect(secondsLeftInRound(opened, 60, openedInstant)).toBe(60);
  });

  it('counts the seconds that have passed', () => {
    expect(secondsLeftInRound(opened, 60, new Date('2026-09-19T12:00:20.000Z'))).toBe(40);
  });

  it('reads the opening time the database returns as well as the one a broadcast carries', () => {
    expect(secondsLeftInRound(openedInstant, 60, new Date('2026-09-19T12:00:20.000Z'))).toBe(40);
  });

  it('stops at zero rather than going negative', () => {
    expect(secondsLeftInRound(opened, 60, new Date('2026-09-19T12:05:00.000Z'))).toBe(0);
  });

  it('answers nothing for a game played without a timer', () => {
    expect(secondsLeftInRound(opened, null, openedInstant)).toBeNull();
  });

  it('answers nothing while no round is open', () => {
    expect(secondsLeftInRound(null, 60, openedInstant)).toBeNull();
  });

  it('answers nothing for an opening time it cannot read', () => {
    expect(secondsLeftInRound('some time last tuesday', 60, openedInstant)).toBeNull();
  });
});

describe('hasRoundTimerExpired', () => {
  it('is false a millisecond before the deadline', () => {
    expect(hasRoundTimerExpired(openedInstant, 60, new Date('2026-09-19T12:00:59.999Z'))).toBe(
      false,
    );
  });

  it('is true on the deadline', () => {
    expect(hasRoundTimerExpired(openedInstant, 60, new Date('2026-09-19T12:01:00.000Z'))).toBe(
      true,
    );
  });

  it('is false for a game played without a timer', () => {
    expect(hasRoundTimerExpired(openedInstant, null, new Date('2027-01-01T00:00:00.000Z'))).toBe(
      false,
    );
  });

  it('is false while no round is open', () => {
    expect(hasRoundTimerExpired(null, 60, new Date('2027-01-01T00:00:00.000Z'))).toBe(false);
  });
});
