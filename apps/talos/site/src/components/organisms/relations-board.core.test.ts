import { describe, expect, it } from 'vitest';
import { selectBirthdayDayKey, selectBirthdayTone, selectCloseness } from './relations-board.core';

describe('selectCloseness', () => {
  it('keeps a closeness between nothing and five, rounded, with its shade', () => {
    expect(selectCloseness(5)).toStrictEqual({ level: 'full', rank: 5 });
    expect(selectCloseness(3.4)).toStrictEqual({ level: 'medium', rank: 3 });
    expect(selectCloseness(1)).toStrictEqual({ level: 'faint', rank: 1 });
    expect(selectCloseness(0)).toStrictEqual({ level: 'none', rank: 0 });
  });

  it('clamps a closeness out of the scale and reads a missing one as none', () => {
    expect(selectCloseness(9)).toStrictEqual({ level: 'full', rank: 5 });
    expect(selectCloseness(-2)).toStrictEqual({ level: 'none', rank: 0 });
    expect(selectCloseness(null)).toStrictEqual({ level: 'none', rank: 0 });
    expect(selectCloseness(Number.NaN)).toStrictEqual({ level: 'none', rank: 0 });
  });
});

describe('selectBirthdayDayKey', () => {
  it('says today, tomorrow, or in how many days', () => {
    expect(selectBirthdayDayKey(0)).toBe('relations.birthday.today');
    expect(selectBirthdayDayKey(1)).toBe('relations.birthday.tomorrow');
    expect(selectBirthdayDayKey(2)).toBe('relations.birthday.in-days');
    expect(selectBirthdayDayKey(-1)).toBe('relations.birthday.today');
  });
});

describe('selectBirthdayTone', () => {
  it('stands out on the day, warns within three days, and stays quiet after', () => {
    expect(selectBirthdayTone(0)).toBe('bronze');
    expect(selectBirthdayTone(1)).toBe('warning');
    expect(selectBirthdayTone(3)).toBe('warning');
    expect(selectBirthdayTone(4)).toBe('neutral');
  });
});
