import { describe, expect, it } from 'vitest';
import type { Challenge, Data, Month, Year } from './data';
import {
  countChallenges,
  filmstripBarColor,
  formatScore,
  kindLabel,
  monthScore,
  pickDefaultMonth,
  pickDefaultYear,
  proofIcon,
  selectFeaturedMonth,
  selectYearData,
  statusColorRole,
  statusLabel,
  yearScore,
} from './data.utils';

function challenge(status: Challenge['status'], kind: Challenge['kind'] = 'oneshot'): Challenge {
  return { t: 'x', kind, status };
}

function month(...statuses: Challenge['status'][]): Month {
  return { m: 1, name: 'Janvier', challenges: statuses.map((s) => challenge(s)) };
}

describe('monthScore', () => {
  it('counts done as 1 and partial as 0.5', () => {
    expect(monthScore(month('done', 'partial', 'failed'))).toEqual({ done: 1.5, total: 3 });
  });

  it('returns zero done when no challenges qualify', () => {
    expect(monthScore(month('failed', 'todo', 'abandoned', 'doing'))).toEqual({
      done: 0,
      total: 4,
    });
  });

  it('returns zero total for an empty month', () => {
    expect(monthScore({ m: 1, name: 'x', challenges: [] })).toEqual({ done: 0, total: 0 });
  });
});

describe('yearScore', () => {
  it('sums month scores', () => {
    const year: Year = {
      title: 't',
      subtitle: 's',
      months: [month('done', 'partial'), month('done'), month('failed')],
    };
    expect(yearScore(year)).toEqual({ done: 2.5, total: 4 });
  });
});

describe('formatScore', () => {
  it('renders integers without decimals', () => {
    expect(formatScore(3)).toBe('3');
  });

  it('renders fractional values with one decimal', () => {
    expect(formatScore(2.5)).toBe('2.5');
  });
});

describe('statusLabel', () => {
  it.each([
    ['done', 'Réussi'],
    ['partial', 'Partiel'],
    ['failed', 'Échoué'],
    ['abandoned', 'Abandonné'],
    ['doing', 'En cours'],
    ['todo', 'À venir'],
  ] as const)('labels %s', (status, expected) => {
    expect(statusLabel(status)).toBe(expected);
  });
});

describe('statusColorRole', () => {
  it.each([
    ['done', 'ink'],
    ['partial', 'warn'],
    ['failed', 'bad'],
    ['abandoned', 'muted'],
    ['doing', 'live'],
    ['todo', 'future'],
  ] as const)('roles %s', (status, expected) => {
    expect(statusColorRole(status)).toBe(expected);
  });
});

describe('kindLabel', () => {
  it.each([
    ['daily', 'quotidien'],
    ['count', 'chiffré'],
    ['oneshot', 'ponctuel'],
  ] as const)('labels %s', (kind, expected) => {
    expect(kindLabel(kind)).toBe(expected);
  });
});

describe('filmstripBarColor', () => {
  it('uses fixed colors for done/partial/failed/doing', () => {
    expect(filmstripBarColor('done', false)).toBe('#7ee29a');
    expect(filmstripBarColor('partial', false)).toBe('#e8b76a');
    expect(filmstripBarColor('failed', false)).toBe('#e89090');
    expect(filmstripBarColor('doing', true)).toBe('#e85a25');
  });

  it('darkens abandoned and todo when the card is active', () => {
    expect(filmstripBarColor('abandoned', true)).toBe('#5a5852');
    expect(filmstripBarColor('abandoned', false)).toBe('#bcb3a0');
    expect(filmstripBarColor('todo', true)).toBe('#3a3530');
    expect(filmstripBarColor('todo', false)).toBe('#d6cdb8');
  });
});

describe('proofIcon', () => {
  it.each([
    ['photo', '◳'],
    ['video', '▷'],
    ['link', '↗'],
    ['note', '¶'],
    ['stat', '#'],
  ] as const)('icons %s', (type, expected) => {
    expect(proofIcon(type)).toBe(expected);
  });
});

describe('countChallenges', () => {
  it('counts challenges matching a predicate', () => {
    const year: Year = {
      title: 't',
      subtitle: 's',
      months: [
        { m: 1, name: 'a', challenges: [challenge('done', 'daily'), challenge('todo', 'daily')] },
        { m: 2, name: 'b', challenges: [challenge('done', 'oneshot')] },
      ],
    };
    expect(countChallenges(year, (kind) => kind === 'daily')).toBe(2);
    expect(countChallenges(year, (_, status) => status === 'done')).toBe(2);
    expect(countChallenges(year, () => false)).toBe(0);
  });
});

describe('pickDefaultMonth', () => {
  it("returns today's month when the rendered year is the current year", () => {
    expect(pickDefaultMonth(2026, new Date('2026-05-12T12:00:00Z'))).toBe(5);
  });

  it('returns 1 when the rendered year is not the current year', () => {
    expect(pickDefaultMonth(2025, new Date('2026-05-12T12:00:00Z'))).toBe(1);
    expect(pickDefaultMonth(2027, new Date('2026-05-12T12:00:00Z'))).toBe(1);
  });
});

describe('pickDefaultYear', () => {
  it('returns the last available year', () => {
    expect(pickDefaultYear([2025, 2026], 1970)).toBe(2026);
  });

  it('returns the fallback when the available years list is empty', () => {
    expect(pickDefaultYear([], 1970)).toBe(1970);
  });
});

describe('selectYearData', () => {
  const data: Data = {
    years: {
      2026: { title: 't', subtitle: 's', months: [{ m: 1, name: 'Jan', challenges: [] }] },
    },
  };

  it('returns the year entry when present', () => {
    expect(selectYearData(data, 2026).title).toBe('t');
  });

  it('throws when the year entry is missing', () => {
    expect(() => selectYearData(data, 2099)).toThrowError('No data for year 2099');
  });
});

describe('selectFeaturedMonth', () => {
  const year: Year = {
    title: 't',
    subtitle: 's',
    months: [
      { m: 1, name: 'Jan', challenges: [] },
      { m: 5, name: 'Mai', challenges: [] },
    ],
  };

  it('returns the month matching the requested number', () => {
    expect(selectFeaturedMonth(year, 5).name).toBe('Mai');
  });

  it("falls back to the first month when the requested number isn't present", () => {
    expect(selectFeaturedMonth(year, 99).name).toBe('Jan');
  });

  it('throws when the year has no months', () => {
    expect(() => selectFeaturedMonth({ title: 't', subtitle: 's', months: [] }, 1)).toThrowError(
      'Year has no months',
    );
  });
});
