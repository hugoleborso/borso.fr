import { describe, expect, it } from 'vitest';
import { isRunStale, listFailedSources, selectAgeLabelKey } from './scan-status.core';

describe('listFailedSources', () => {
  it('lists the failed sources of the scan, then those of the Mac collection, prefixed', () => {
    expect(
      listFailedSources(
        {
          scan: { at: 'x', failedSources: ['Strava', 'Notion'] },
          macCollection: { at: 'y', failedSources: ['iMessage'] },
        },
        'Mac',
      ),
    ).toEqual(['Strava', 'Notion', 'Mac · iMessage']);
  });

  it('answers nothing for runs that never happened', () => {
    expect(listFailedSources({ scan: null, macCollection: null }, 'Mac')).toEqual([]);
  });
});

describe('selectAgeLabelKey', () => {
  it('labels each unit of age', () => {
    expect(selectAgeLabelKey('minutes')).toBe('age.minutes');
    expect(selectAgeLabelKey('hours')).toBe('age.hours');
    expect(selectAgeLabelKey('days')).toBe('age.days');
  });
});

describe('isRunStale', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');

  it('calls a scan older than a day stale', () => {
    expect(isRunStale({ at: '2026-10-15T11:59:00Z', failedSources: [] }, now)).toBe(true);
  });

  it('keeps a scan of exactly a day, or fresher, current', () => {
    expect(isRunStale({ at: '2026-10-15T12:00:00Z', failedSources: [] }, now)).toBe(false);
    expect(isRunStale({ at: '2026-10-16T09:00:00Z', failedSources: [] }, now)).toBe(false);
  });

  it('calls a missing or unreadable scan stale', () => {
    expect(isRunStale(null, now)).toBe(true);
    expect(isRunStale({ at: 'hier', failedSources: [] }, now)).toBe(true);
  });
});
