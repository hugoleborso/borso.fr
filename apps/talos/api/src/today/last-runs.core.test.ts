import { describe, expect, it } from 'vitest';
import { parseLastRuns } from './last-runs.core';

describe('parseLastRuns', () => {
  it('reads when the scan and the Mac collection last ran, and which sources failed', () => {
    const raw = JSON.stringify({
      scan: {
        date: '2026-10-09T03:24:10+02:00',
        par: 'nuit',
        sources_ok: 9,
        sources_ko: ['Strava'],
      },
      collecte_mac: { date: '2026-10-08T23:00:00+02:00', sources_ok: 5 },
    });
    expect(parseLastRuns(raw)).toStrictEqual({
      scan: { at: '2026-10-09T03:24:10+02:00', trigger: 'nuit', failedSources: ['Strava'] },
      macCollection: { at: '2026-10-08T23:00:00+02:00', failedSources: [] },
    });
  });

  it('answers null for a run that never happened or is unreadable', () => {
    expect(parseLastRuns(JSON.stringify({ scan: { date: '' } }))).toEqual({
      scan: null,
      macCollection: null,
    });
    expect(parseLastRuns('{}')).toEqual({ scan: null, macCollection: null });
  });

  it('answers null when the file is not an object', () => {
    expect(parseLastRuns('pas du json')).toBeNull();
    expect(parseLastRuns('[1]')).toBeNull();
  });
});
