import { describe, expect, it } from 'vitest';
import { formatDuration } from './song-duration.utils';

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
