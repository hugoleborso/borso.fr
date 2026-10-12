import { describe, expect, it } from 'vitest';
import { listFailedSources, selectAgeLabelKey } from './scan-status.core';

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
