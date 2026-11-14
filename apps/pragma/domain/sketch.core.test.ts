import { describe, expect, it } from 'vitest';
import {
  SKETCH_OFFSET_LAST_SECOND,
  SKETCH_TAIL_SECONDS,
  selectTimelineLengthSeconds,
  snapOffsetSeconds,
} from './sketch.core';

// @FollowsBlueprint test-pure-unit
describe('the sketch timeline rules', () => {
  it('snaps 3.6 s to 4 and -2 s to 0, and extends the timeline 30 s past the last clip', () => {
    expect(snapOffsetSeconds(3.6)).toBe(4);
    expect(snapOffsetSeconds(3.4)).toBe(3);
    expect(snapOffsetSeconds(-2)).toBe(0);
    expect(selectTimelineLengthSeconds([12, 64, 40])).toBe(64 + SKETCH_TAIL_SECONDS);
  });

  it('keeps an offset on the last second a clip may start at', () => {
    expect(snapOffsetSeconds(SKETCH_OFFSET_LAST_SECOND + 10)).toBe(SKETCH_OFFSET_LAST_SECOND);
  });

  it('shows only the tail on a sketch with no clip', () => {
    expect(selectTimelineLengthSeconds([])).toBe(SKETCH_TAIL_SECONDS);
  });
});
