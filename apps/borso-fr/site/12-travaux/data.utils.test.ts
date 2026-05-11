import { describe, expect, it } from 'vitest';
import type { Challenge, Month, Year } from './data';
import {
  countChallenges,
  filmstripBarColor,
  formatScore,
  kindLabel,
  monthScore,
  proofIcon,
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
