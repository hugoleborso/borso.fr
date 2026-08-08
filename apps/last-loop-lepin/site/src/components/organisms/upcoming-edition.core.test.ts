import { describe, expect, it } from 'vitest';
import type { RaceEditionDto } from '../../lib/race.types';
import { selectDistanceLabelKey } from './upcoming-edition.core';

function buildEdition(distanceMeters: number): RaceEditionDto {
  return {
    slug: 'lepin-2026',
    displayName: 'Last Loop Lépin 2026',
    startsAt: '2026-06-13T04:00:00.000Z',
    endsAt: '2026-06-13T20:00:00.000Z',
    sunriseAt: '2026-06-13T03:45:00.000Z',
    sunsetAt: '2026-06-13T19:45:00.000Z',
    intervalMinutes: 60,
    status: 'setup',
    gpx: {
      distanceMeters,
      elevationGainMeters: 0,
      trackJson: { points: [] },
      startLatLng: { lat: 45.55, lng: 5.78 },
    },
  };
}

describe('selectDistanceLabelKey', () => {
  it('shows the placeholder while no track has been uploaded', () => {
    expect(selectDistanceLabelKey(buildEdition(0))).toBe('spectator.track-pending');
  });

  it('shows the distance once the track is on file', () => {
    expect(selectDistanceLabelKey(buildEdition(5_800))).toBe('common.distance');
  });
});
