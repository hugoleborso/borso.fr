import { describe, expect, it } from 'vitest';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import {
  listRunnerMarkers,
  projectCurrentLoopIndex,
  selectProjectionMode,
} from './course-map-markers.core';

const RACE_START = '2026-06-13T04:00:00.000Z';
const HOUR_MS = 60 * 60 * 1000;
const RACE_START_MS = new Date(RACE_START).getTime();

function buildEdition(overrides: Partial<RaceEditionDto> = {}): RaceEditionDto {
  return {
    slug: 'lepin-2026',
    displayName: 'Last Loop Lépin 2026',
    startsAt: RACE_START,
    endsAt: '2026-06-13T20:00:00.000Z',
    sunriseAt: '2026-06-13T03:45:00.000Z',
    sunsetAt: '2026-06-13T19:45:00.000Z',
    intervalMinutes: 60,
    status: 'live',
    gpx: {
      distanceMeters: 5_800,
      elevationGainMeters: 250,
      trackJson: {
        points: [
          { lat: 45.55, lng: 5.78 },
          { lat: 45.56, lng: 5.79 },
          { lat: 45.57, lng: 5.8 },
        ],
      },
      startLatLng: { lat: 45.55, lng: 5.78 },
    },
    ...overrides,
  };
}

function buildRunner(overrides: Partial<RankedRunnerDto> = {}): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug: 'alice',
      displayName: 'Alice',
      photoKey: null,
      photoUrl: null,
      bib: 1,
    },
    rank: 1,
    status: { kind: 'in-race', lastLoop: 0 },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('selectProjectionMode', () => {
  it('falls back to the linear projection when the track carries no timings', () => {
    expect(selectProjectionMode(undefined)).toBe('linear-fallback');
  });

  it('uses the recorded pace when the track carries timings', () => {
    expect(selectProjectionMode([0, 0.5, 1])).toBe('recorded-pace');
  });
});

describe('projectCurrentLoopIndex', () => {
  it('starts at loop one before the race has begun', () => {
    expect(projectCurrentLoopIndex(RACE_START, 60, RACE_START_MS - HOUR_MS)).toBe(1);
  });

  it('stays on loop one until the first top of hour', () => {
    expect(projectCurrentLoopIndex(RACE_START, 60, RACE_START_MS + HOUR_MS - 1)).toBe(1);
  });

  it('moves to loop two at the first top of hour', () => {
    expect(projectCurrentLoopIndex(RACE_START, 60, RACE_START_MS + HOUR_MS)).toBe(2);
  });

  it('treats an interval below one minute as one minute', () => {
    expect(projectCurrentLoopIndex(RACE_START, 0, RACE_START_MS + 60_000)).toBe(2);
  });
});

describe('listRunnerMarkers', () => {
  it('returns nothing while the edition is still in setup', () => {
    const edition = buildEdition({ status: 'setup' });
    expect(listRunnerMarkers(edition, [buildRunner()], RACE_START_MS)).toEqual([]);
  });

  it('returns nothing when the track carries no length', () => {
    const edition = buildEdition();
    const emptyTrack: RaceEditionDto = {
      ...edition,
      gpx: { ...edition.gpx, trackJson: { points: [] } },
    };
    expect(listRunnerMarkers(emptyTrack, [buildRunner()], RACE_START_MS)).toEqual([]);
  });

  it('skips a runner who is out of the race', () => {
    const out = buildRunner({ status: { kind: 'dnf', outAtLoop: 1, reason: 'late' } });
    expect(listRunnerMarkers(buildEdition(), [out], RACE_START_MS + HOUR_MS)).toEqual([]);
  });

  it('marks a runner who already closed the current loop as resting at the corral', () => {
    const resting = buildRunner({ status: { kind: 'in-race', lastLoop: 2 } });
    const markers = listRunnerMarkers(buildEdition(), [resting], RACE_START_MS + HOUR_MS);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.titleKey).toBe('course-map.runner-at-corral');
    expect(markers[0]?.titleParameters.loopCount).toBe(2);
  });

  it('reports the progress of a runner part way through the current loop', () => {
    const running = buildRunner({ status: { kind: 'in-race', lastLoop: 0 } });
    const markers = listRunnerMarkers(buildEdition(), [running], RACE_START_MS + HOUR_MS / 2);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.titleKey).toBe('course-map.runner-progress');
    expect(markers[0]?.titleParameters).toMatchObject({ name: 'Alice', loop: 1, percent: '50' });
  });

  it('keys each marker by edition and runner slug', () => {
    const markers = listRunnerMarkers(buildEdition(), [buildRunner()], RACE_START_MS + HOUR_MS / 2);
    expect(markers[0]?.runnerKey).toBe('lepin-2026-alice');
  });

  it('places the marker on the track and carries the avatar markup', () => {
    const markers = listRunnerMarkers(buildEdition(), [buildRunner()], RACE_START_MS + HOUR_MS / 2);
    expect(markers[0]?.position.lat).toBeGreaterThan(45.55);
    expect(markers[0]?.avatarHtml).toContain('data-runner-slug="alice"');
  });

  it('uses the recorded pace projection when the track carries timings', () => {
    const edition = buildEdition();
    const timed: RaceEditionDto = {
      ...edition,
      gpx: {
        ...edition.gpx,
        trackJson: { ...edition.gpx.trackJson, pointTimeFractions: [0, 0.9, 1] },
      },
    };
    const timedMarkers = listRunnerMarkers(timed, [buildRunner()], RACE_START_MS + HOUR_MS / 2);
    const linearMarkers = listRunnerMarkers(edition, [buildRunner()], RACE_START_MS + HOUR_MS / 2);
    expect(timedMarkers).toHaveLength(1);
    expect(timedMarkers[0]?.position.lat).toBeGreaterThan(45.55);
    // The recorded pace spends 90 % of the loop on the first segment, so
    // the halfway avatar sits somewhere the linear projection never puts it.
    expect(timedMarkers[0]?.position).not.toEqual(linearMarkers[0]?.position);
  });
});
