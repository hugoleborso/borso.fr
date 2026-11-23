import { describe, expect, it } from 'vitest';
import { selectFlameTone } from './flame-tone.core';

const COUNTED = { days: 12, isTodayCounted: true };
const OPEN = { days: 12, isTodayCounted: false };
const OUT = { days: 0, isTodayCounted: false };

// @FollowsBlueprint test-pure-unit
describe('selectFlameTone', () => {
  it('lights the flame once today counts', () => {
    expect(selectFlameTone(COUNTED)).toBe('counted');
  });

  it('keeps a live flame open while today has not counted yet', () => {
    expect(selectFlameTone(OPEN)).toBe('open');
  });

  it('puts out a flame of zero days', () => {
    expect(selectFlameTone(OUT)).toBe('out');
  });
});
