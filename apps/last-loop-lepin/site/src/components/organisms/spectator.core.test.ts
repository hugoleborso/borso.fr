import { describe, expect, it } from 'vitest';
import type { RaceEditionDto } from '../../lib/race.types';
import {
  collectFastestLapSlugs,
  isRaceOver,
  listArchivedEditions,
  listFinishedEditions,
  projectNextLoopBoundaryMs,
  isShowingAnnouncement,
  readCorrectionInstant,
  selectRacingEdition,
  selectSpectatorView,
} from './spectator.core';

const HOUR_MS = 60 * 60 * 1000;

function buildEdition(overrides: Partial<RaceEditionDto> = {}): RaceEditionDto {
  return {
    slug: 'lepin-2026',
    displayName: 'Last Loop Lépin 2026',
    startsAt: '2026-06-13T04:00:00.000Z',
    endsAt: '2026-06-13T20:00:00.000Z',
    sunriseAt: '2026-06-13T03:45:00.000Z',
    sunsetAt: '2026-06-13T19:45:00.000Z',
    intervalMinutes: 60,
    status: 'live',
    gpx: {
      distanceMeters: 5_800,
      elevationGainMeters: 250,
      trackJson: { points: [] },
      startLatLng: { lat: 45.55, lng: 5.78 },
    },
    ...overrides,
  };
}

const START_MS = new Date('2026-06-13T04:00:00.000Z').getTime();
const END_MS = new Date('2026-06-13T20:00:00.000Z').getTime();

// @FollowsBlueprint test-pure-unit
describe('selectSpectatorView', () => {
  it('waits when there is no edition', () => {
    expect(selectSpectatorView(null)).toBe('waiting');
  });

  it('waits while the edition is still in setup', () => {
    expect(selectSpectatorView(buildEdition({ status: 'setup' }))).toBe('waiting');
  });

  it('shows the race once the edition is live', () => {
    expect(selectSpectatorView(buildEdition())).toBe('racing');
  });

  it('keeps showing the race once the edition is finished', () => {
    expect(selectSpectatorView(buildEdition({ status: 'finished' }))).toBe('racing');
  });
});

describe('isRaceOver', () => {
  it('is false for a live race whose standings still have runners', () => {
    expect(isRaceOver(buildEdition(), false)).toBe(false);
  });

  it('is true once the operator closed the edition', () => {
    expect(isRaceOver(buildEdition({ status: 'finished' }), false)).toBe(true);
  });

  it('is true once the standings report the race ended', () => {
    expect(isRaceOver(buildEdition(), true)).toBe(true);
  });
});

describe('projectNextLoopBoundaryMs', () => {
  it('returns the start before the gun', () => {
    expect(projectNextLoopBoundaryMs(buildEdition(), START_MS - HOUR_MS)).toBe(START_MS);
  });

  it('returns the start at the gun', () => {
    expect(projectNextLoopBoundaryMs(buildEdition(), START_MS)).toBe(START_MS);
  });

  it('returns the next top of the hour mid race', () => {
    expect(projectNextLoopBoundaryMs(buildEdition(), START_MS + HOUR_MS / 2)).toBe(
      START_MS + HOUR_MS,
    );
  });

  it('returns the end at the cut off', () => {
    expect(projectNextLoopBoundaryMs(buildEdition(), END_MS)).toBe(END_MS);
  });

  it('returns the end past the cut off', () => {
    expect(projectNextLoopBoundaryMs(buildEdition(), END_MS + HOUR_MS)).toBe(END_MS);
  });
});

describe('listFinishedEditions', () => {
  it('keeps only the finished ones', () => {
    const editions = [buildEdition(), buildEdition({ slug: 'lepin-2025', status: 'finished' })];
    expect(listFinishedEditions(editions).map((edition) => edition.slug)).toEqual(['lepin-2025']);
  });
});

describe('listArchivedEditions', () => {
  it('orders the finished editions with the most recent first', () => {
    const editions = [
      buildEdition({ slug: 'old', status: 'finished', endsAt: '2024-06-13T20:00:00.000Z' }),
      buildEdition({ slug: 'recent', status: 'finished', endsAt: '2025-06-13T20:00:00.000Z' }),
      buildEdition({ slug: 'live-one' }),
    ];
    expect(listArchivedEditions(editions).map((edition) => edition.slug)).toEqual([
      'recent',
      'old',
    ]);
  });
});

describe('readCorrectionInstant', () => {
  it('returns null when no correction has landed', () => {
    expect(readCorrectionInstant(null)).toBeNull();
  });

  it('parses the recorded instant', () => {
    expect(readCorrectionInstant('2026-06-13T07:30:00.000Z')).toEqual(
      new Date('2026-06-13T07:30:00.000Z'),
    );
  });
});

describe('collectFastestLapSlugs', () => {
  it('returns an empty set when no loop has been closed', () => {
    expect(collectFastestLapSlugs([]).size).toBe(0);
  });

  it('collects every runner holding the record', () => {
    expect(collectFastestLapSlugs([{ runnerSlug: 'alice' }, { runnerSlug: 'bob' }])).toEqual(
      new Set(['alice', 'bob']),
    );
  });
});

describe('selectRacingEdition', () => {
  it('returns nothing when there is no edition', () => {
    expect(selectRacingEdition(null)).toBeNull();
  });

  it('returns nothing while the edition is still in setup', () => {
    expect(selectRacingEdition(buildEdition({ status: 'setup' }))).toBeNull();
  });

  it('returns the edition once it is live', () => {
    expect(selectRacingEdition(buildEdition())?.slug).toBe('lepin-2026');
  });
});

describe('isShowingAnnouncement', () => {
  it('is false when the edition request failed', () => {
    expect(isShowingAnnouncement(true, null)).toBe(false);
  });

  it('is true when there is no edition and the request succeeded', () => {
    expect(isShowingAnnouncement(false, null)).toBe(true);
  });

  it('is false once the edition is live', () => {
    expect(isShowingAnnouncement(false, buildEdition())).toBe(false);
  });
});
