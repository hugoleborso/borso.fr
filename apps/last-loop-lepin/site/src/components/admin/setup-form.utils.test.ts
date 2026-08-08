import { describe, expect, it } from 'vitest';
import {
  defaultEndsAt,
  defaultStartsAt,
  isoLocal,
  suggestNextSlug,
  summariseZodError,
} from './setup-form.utils';

describe('isoLocal', () => {
  it('pads month, day, hours, minutes to two digits', () => {
    const date = new Date(2026, 0, 5, 7, 3);
    expect(isoLocal(date)).toBe('2026-01-05T07:03');
  });

  it('handles December (12) and 23:59 without rollover', () => {
    const date = new Date(2026, 11, 31, 23, 59);
    expect(isoLocal(date)).toBe('2026-12-31T23:59');
  });
});

describe('defaultStartsAt / defaultEndsAt', () => {
  const reference = new Date(2026, 4, 14, 14, 22);

  it('startsAt resets to 06:00 of the same day', () => {
    expect(defaultStartsAt(reference)).toBe('2026-05-14T06:00');
  });

  it('endsAt resets to 22:00 of the same day', () => {
    expect(defaultEndsAt(reference)).toBe('2026-05-14T22:00');
  });

  it('pins the start time to 06:00 on whatever day the caller passes', () => {
    expect(defaultStartsAt(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01T06:00');
  });

  it('pins the end time to 22:00 on whatever day the caller passes', () => {
    expect(defaultEndsAt(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31T22:00');
  });
});

describe('suggestNextSlug', () => {
  it('falls back to lepin-2026 when no current slug', () => {
    expect(suggestNextSlug(undefined)).toBe('lepin-2026');
  });

  it('increments the trailing 4-digit year', () => {
    expect(suggestNextSlug('lepin-2026')).toBe('lepin-2027');
    expect(suggestNextSlug('lepin-le-lac-2025')).toBe('lepin-le-lac-2026');
  });

  it('appends -next when no trailing 4-digit year is present', () => {
    expect(suggestNextSlug('summer-special')).toBe('summer-special-next');
  });

  it('handles a bare 4-digit slug by incrementing as a year', () => {
    expect(suggestNextSlug('2026')).toBe('2027');
  });
});

describe('summariseZodError', () => {
  it('extracts path:message pairs joined with " · "', () => {
    const body = {
      error: {
        issues: [
          { path: ['slug'], message: 'too short' },
          { path: ['startsAt'], message: 'Invalid datetime' },
        ],
      },
    };
    expect(summariseZodError(body)).toBe('slug: too short · startsAt: Invalid datetime');
  });

  it('uses ? as placeholder when path is missing', () => {
    const body = { error: { issues: [{ message: 'invalid' }] } };
    expect(summariseZodError(body)).toBe('?: invalid');
  });

  it('uses "invalide" as placeholder when message is missing', () => {
    const body = { error: { issues: [{ path: ['gpxXml'] }] } };
    expect(summariseZodError(body)).toBe('gpxXml: invalide');
  });

  it('returns null for non-matching shapes', () => {
    expect(summariseZodError(null)).toBeNull();
    expect(summariseZodError({})).toBeNull();
    expect(summariseZodError({ error: { issues: [] } })).toBeNull();
    expect(summariseZodError('not an object')).toBeNull();
  });
});
