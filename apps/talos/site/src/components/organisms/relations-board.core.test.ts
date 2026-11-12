import { describe, expect, it } from 'vitest';
import { selectBirthdayDayKey, selectBirthdayTone, selectCloseness } from './relations-board.core';

describe('selectCloseness', () => {
  it.each([
    [0, 'contact', 'closeness.name.person.0'],
    [1, 'faint', 'closeness.name.person.1'],
    [2, 'light', 'closeness.name.person.2'],
    [3, 'medium', 'closeness.name.person.3'],
    [4, 'strong', 'closeness.name.person.4'],
    [5, 'full', 'closeness.name.person.5'],
  ] as const)('gives the level %s its own look and its name', (rank, level, nameKey) => {
    expect(selectCloseness(rank)).toStrictEqual({
      level,
      rank,
      labelKey: 'relations.closeness.named',
      nameKey,
    });
  });

  it('keeps a person with no closeness on the look « none », apart from a 0', () => {
    const unscored = {
      level: 'none',
      rank: null,
      labelKey: 'relations.closeness.unscored',
      nameKey: null,
    };
    expect(selectCloseness(null)).toStrictEqual(unscored);
    expect(selectCloseness(Number.NaN)).toStrictEqual(unscored);
    expect(selectCloseness(0).level).not.toBe(selectCloseness(null).level);
  });

  it.each([
    [6, 'full'],
    [2.5, 'medium'],
    [3.4, 'medium'],
    [-2, 'contact'],
  ] as const)('shows %s, outside the scale, as a number without a name', (rank, level) => {
    expect(selectCloseness(rank)).toStrictEqual({
      level,
      rank,
      labelKey: 'relations.closeness.unnamed',
      nameKey: null,
    });
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
