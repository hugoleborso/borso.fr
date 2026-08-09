import { describe, expect, it } from 'vitest';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { indexTrack } from './course-map.utils';
import { hasElevationSamples, listElevationPastilles } from './elevation-pastilles.core';
import { buildProfileGeometry } from './elevation-profile.utils';

const RACE_START = '2026-06-13T04:00:00.000Z';
const RACE_START_MS = new Date(RACE_START).getTime();
const HOUR_MS = 60 * 60 * 1000;
const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 200;

const POINTS = [
  { lat: 45.55, lng: 5.78 },
  { lat: 45.56, lng: 5.79 },
  { lat: 45.57, lng: 5.8 },
];

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
      trackJson: { points: POINTS, pointElevations: [400, 460, 420] },
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

function buildGeometry(edition: RaceEditionDto) {
  return buildProfileGeometry(
    edition.gpx.trackJson.pointElevations ?? [],
    indexTrack(edition.gpx.trackJson.points).cumulative,
    VIEWBOX_WIDTH,
    VIEWBOX_HEIGHT,
  );
}

describe('hasElevationSamples', () => {
  it('is false when the track carries no elevations', () => {
    const edition = buildEdition();
    expect(
      hasElevationSamples({
        ...edition,
        gpx: { ...edition.gpx, trackJson: { points: POINTS } },
      }),
    ).toBe(false);
  });

  it('is false when the track carries a single elevation', () => {
    const edition = buildEdition();
    expect(
      hasElevationSamples({
        ...edition,
        gpx: { ...edition.gpx, trackJson: { points: POINTS, pointElevations: [400] } },
      }),
    ).toBe(false);
  });

  it('is false when the track carries a single point', () => {
    const edition = buildEdition();
    expect(
      hasElevationSamples({
        ...edition,
        gpx: {
          ...edition.gpx,
          trackJson: { points: [POINTS[0] ?? { lat: 0, lng: 0 }], pointElevations: [400, 460] },
        },
      }),
    ).toBe(false);
  });

  it('is true when the track carries enough of both', () => {
    expect(hasElevationSamples(buildEdition())).toBe(true);
  });

  it('is true at exactly two points and two elevations', () => {
    const edition = buildEdition();
    expect(
      hasElevationSamples({
        ...edition,
        gpx: {
          ...edition.gpx,
          trackJson: {
            points: [POINTS[0] ?? { lat: 0, lng: 0 }, POINTS[1] ?? { lat: 0, lng: 0 }],
            pointElevations: [400, 460],
          },
        },
      }),
    ).toBe(true);
  });
});

describe('listElevationPastilles', () => {
  it('returns nothing while the edition is not live', () => {
    const edition = buildEdition({ status: 'finished' });
    expect(
      listElevationPastilles(
        edition,
        [buildRunner()],
        RACE_START_MS,
        buildGeometry(edition),
        VIEWBOX_WIDTH,
      ),
    ).toEqual([]);
  });

  it('skips a runner resting at the corral', () => {
    const edition = buildEdition();
    const resting = buildRunner({ status: { kind: 'in-race', lastLoop: 2 } });
    expect(
      listElevationPastilles(
        edition,
        [resting],
        RACE_START_MS + HOUR_MS,
        buildGeometry(edition),
        VIEWBOX_WIDTH,
      ),
    ).toEqual([]);
  });

  it('places a running runner at the fraction of the view box they have covered', () => {
    const edition = buildEdition();
    const pastilles = listElevationPastilles(
      edition,
      [buildRunner()],
      RACE_START_MS + HOUR_MS / 2,
      buildGeometry(edition),
      VIEWBOX_WIDTH,
    );
    expect(pastilles).toHaveLength(1);
    expect(pastilles[0]?.centerX).toBeCloseTo(VIEWBOX_WIDTH / 2, 5);
    expect(pastilles[0]?.runnerKey).toBe('lepin-2026-alice');
    expect(pastilles[0]?.initials).toBe('AL');
    expect(pastilles[0]?.photoUrl).toBeNull();
  });

  it('carries the photo URL when the runner has one', () => {
    const edition = buildEdition();
    const withPhoto = buildRunner({
      runner: {
        editionSlug: 'lepin-2026',
        slug: 'bob',
        displayName: 'Bob Martin',
        photoKey: 'photos/bob.jpg',
        photoUrl: 'https://photos.example/bob.jpg',
        bib: 2,
      },
    });
    const pastilles = listElevationPastilles(
      edition,
      [withPhoto],
      RACE_START_MS + HOUR_MS / 2,
      buildGeometry(edition),
      VIEWBOX_WIDTH,
    );
    expect(pastilles[0]?.photoUrl).toBe('https://photos.example/bob.jpg');
    expect(pastilles[0]?.initials).toBe('BM');
  });
});
