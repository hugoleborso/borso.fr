import { describe, expect, it } from 'vitest';
import { describeTotalDuration, formatDuration, sumKnownDurations } from './song-duration.utils';

// @FollowsBlueprint test-pure-unit
describe('formatDuration', () => {
  it('pads a seconds value below ten', () => {
    expect(formatDuration(185)).toBe('3:05');
  });

  it('keeps a seconds value of ten or more as it is', () => {
    expect(formatDuration(214)).toBe('3:34');
  });

  it('writes a whole number of minutes with two zero seconds', () => {
    expect(formatDuration(120)).toBe('2:00');
  });

  it('writes a track under a minute with a zero minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('writes a track of no length at all as zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('carries past an hour into the minutes', () => {
    expect(formatDuration(3_661)).toBe('61:01');
  });
});

// @FollowsBlueprint test-pure-unit
describe('sumKnownDurations', () => {
  it('adds the durations that are known and skips the others', () => {
    expect(sumKnownDurations([180, null, 240, undefined])).toBe(420);
  });

  it('knows no total when no song has a duration', () => {
    expect(sumKnownDurations([null, undefined])).toBeNull();
    expect(sumKnownDurations([])).toBeNull();
  });
});

// @FollowsBlueprint test-pure-unit
describe('describeTotalDuration', () => {
  it('writes a set under an hour in minutes', () => {
    expect(describeTotalDuration(48 * 60)).toEqual({ kind: 'minutes', hours: 0, minutes: '48' });
  });

  it('writes hours and padded minutes past an hour', () => {
    expect(describeTotalDuration(78 * 60)).toEqual({
      kind: 'hoursMinutes',
      hours: 1,
      minutes: '18',
    });
    expect(describeTotalDuration(65 * 60)).toEqual({
      kind: 'hoursMinutes',
      hours: 1,
      minutes: '05',
    });
  });

  it('rounds to the nearest minute', () => {
    expect(describeTotalDuration(29)).toEqual({ kind: 'minutes', hours: 0, minutes: '0' });
    expect(describeTotalDuration(30)).toEqual({ kind: 'minutes', hours: 0, minutes: '1' });
  });
});
