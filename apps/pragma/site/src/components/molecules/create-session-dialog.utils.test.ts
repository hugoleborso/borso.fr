import { describe, expect, it } from 'vitest';
import {
  dateTimeLocalToIso,
  defaultDateTimeLocal,
  filterFutureConcerts,
  formatDateTimeLocal,
} from './create-session-dialog.utils';

describe('formatDateTimeLocal', () => {
  it('pads month, day, hour and minute to two digits', () => {
    const date = new Date(2024, 0, 5, 3, 7);
    expect(formatDateTimeLocal(date)).toBe('2024-01-05T03:07');
  });

  it('preserves a fully-padded date', () => {
    const date = new Date(2031, 10, 25, 22, 45);
    expect(formatDateTimeLocal(date)).toBe('2031-11-25T22:45');
  });
});

describe('defaultDateTimeLocal', () => {
  it('returns tomorrow at 20:00 local time', () => {
    const now = new Date(2026, 4, 10, 9, 30);
    expect(defaultDateTimeLocal(now)).toBe('2026-05-11T20:00');
  });

  it('rolls past month boundaries', () => {
    const now = new Date(2026, 0, 31, 12, 0);
    expect(defaultDateTimeLocal(now)).toBe('2026-02-01T20:00');
  });
});

describe('dateTimeLocalToIso', () => {
  it('converts a valid local datetime to an ISO string', () => {
    const iso = dateTimeLocalToIso('2026-05-11T20:00');
    expect(iso).not.toBeNull();
    expect(iso?.endsWith('Z')).toBe(true);
  });

  it('returns null on a string shorter than the expected length', () => {
    expect(dateTimeLocalToIso('2026-05')).toBeNull();
  });

  it('returns null on an unparseable datetime literal', () => {
    expect(dateTimeLocalToIso('not-a-date-at-al')).toBeNull();
  });
});

describe('filterFutureConcerts', () => {
  const now = new Date('2026-05-25T12:00:00Z');

  it('keeps concerts strictly after now', () => {
    const concerts = [
      { id: 'a', date: '2026-05-26T12:00:00Z' },
      { id: 'b', date: '2026-05-24T12:00:00Z' },
    ];
    const future = filterFutureConcerts(concerts, now);
    expect(future).toEqual([{ id: 'a', date: '2026-05-26T12:00:00Z' }]);
  });

  it('drops concerts whose date is unparseable', () => {
    const concerts = [
      { id: 'a', date: 'not-a-date' },
      { id: 'b', date: '2026-05-26T12:00:00Z' },
    ];
    const future = filterFutureConcerts(concerts, now);
    expect(future).toEqual([{ id: 'b', date: '2026-05-26T12:00:00Z' }]);
  });

  it('returns an empty list when nothing is in the future', () => {
    const concerts = [{ id: 'a', date: '2020-01-01T00:00:00Z' }];
    expect(filterFutureConcerts(concerts, now)).toEqual([]);
  });
});
