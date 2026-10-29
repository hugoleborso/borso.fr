import { describe, expect, it } from 'vitest';
import {
  FLAME_TONE_CLASS,
  selectFlameStatusKey,
  selectFlameTone,
  selectTodayStatusKey,
} from './flame-tone.core';

const COUNTED = { days: 12, isTodayCounted: true };
const OPEN = { days: 12, isTodayCounted: false };
const OUT = { days: 0, isTodayCounted: false };

// @FollowsBlueprint test-pure-unit
describe('selectFlameTone', () => {
  it('lights the flame in accent once today counts', () => {
    expect(selectFlameTone(COUNTED)).toBe('counted');
  });

  it('keeps a live flame open while today has not counted yet', () => {
    expect(selectFlameTone(OPEN)).toBe('open');
  });

  it('puts out a flame of zero days', () => {
    expect(selectFlameTone(OUT)).toBe('out');
  });
});

describe('FLAME_TONE_CLASS', () => {
  it('draws the flame with accent tokens only, filled soft while today is open', () => {
    expect(FLAME_TONE_CLASS.flame).toEqual({
      counted: 'text-accent fill-accent',
      open: 'text-accent fill-accent-soft',
      out: 'text-ink-faint',
    });
  });

  it('never fills the members glyph, whose open strokes a fill would blot', () => {
    expect(FLAME_TONE_CLASS.members).toEqual({
      counted: 'text-accent',
      open: 'text-accent',
      out: 'text-ink-faint',
    });
  });
});

describe('selectFlameStatusKey', () => {
  it('says today counted, today still open, or no flame yet', () => {
    expect(selectFlameStatusKey(COUNTED)).toBe('streaks.todayCounted');
    expect(selectFlameStatusKey(OPEN)).toBe('streaks.todayOpen');
    expect(selectFlameStatusKey(OUT)).toBe('streaks.noFlame');
  });
});

describe('selectTodayStatusKey', () => {
  it('names the state of today even for a flame of zero days', () => {
    expect(selectTodayStatusKey(COUNTED)).toBe('streaks.todayCounted');
    expect(selectTodayStatusKey(OUT)).toBe('streaks.todayOpen');
  });
});
