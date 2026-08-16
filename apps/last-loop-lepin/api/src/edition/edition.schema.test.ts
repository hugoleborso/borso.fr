/**
 * The two refinements are the rules that matter: a per-point array that does
 * not match the point count would silently mis-place every elevation on the
 * profile, and the type checker cannot see it.
 */

import { describe, expect, it } from 'vitest';
import {
  createEditionInputSchema,
  editionSlugSchema,
  editionStatusUpdateSchema,
  gpxMetadataSchema,
  isEditionStatus,
  updateEditionInputSchema,
} from './edition.schema';

const startsAt = '2026-09-19T06:00:00+02:00';
const endsAt = '2026-09-20T06:00:00+02:00';
const points = [
  { lat: 45.1, lng: 5.7 },
  { lat: 45.2, lng: 5.8 },
];

function metadata(trackJson: Record<string, unknown>): unknown {
  return {
    distanceMeters: 6_600,
    elevationGainMeters: 120,
    trackJson,
    startLatLng: { lat: 45.1, lng: 5.7 },
  };
}

function edition(overrides: Record<string, unknown> = {}): unknown {
  return {
    slug: 'lepin-2026',
    displayName: 'Lépin 2026',
    startsAt,
    endsAt,
    gpxXml: '<gpx/>',
    ...overrides,
  };
}

describe('editionSlugSchema', () => {
  it('accepts lowercase letters, digits and dashes, and refuses the rest', () => {
    expect(editionSlugSchema.safeParse('lepin-2026').success).toBe(true);
    expect(editionSlugSchema.safeParse('Lepin').success).toBe(false);
    expect(editionSlugSchema.safeParse('ab').success).toBe(false);
    expect(editionSlugSchema.safeParse('a'.repeat(65)).success).toBe(false);
  });
});

describe('gpxMetadataSchema', () => {
  it('accepts a track with no per-point arrays', () => {
    expect(gpxMetadataSchema.safeParse(metadata({ points })).success).toBe(true);
  });

  it('accepts per-point arrays that match the point count', () => {
    expect(
      gpxMetadataSchema.safeParse(
        metadata({ points, pointTimeFractions: [0, 1], pointElevations: [100, 120] }),
      ).success,
    ).toBe(true);
  });

  it('refuses time fractions that do not match the point count, and says which', () => {
    // Monotonic from 0 to 1, so the only rule left to break is the length one.
    expect(() =>
      gpxMetadataSchema.parse(metadata({ points, pointTimeFractions: [0, 0.5, 1] })),
    ).toThrow('pointTimeFractions.length');
  });

  it('refuses elevations that do not match the point count, and says which', () => {
    expect(() => gpxMetadataSchema.parse(metadata({ points, pointElevations: [100] }))).toThrow(
      'pointElevations.length',
    );
  });
});

describe('isEditionStatus', () => {
  it('knows the three states a race moves through', () => {
    for (const status of ['setup', 'live', 'finished']) {
      expect(isEditionStatus(status)).toBe(true);
    }
  });

  it('rejects anything else, including a non-string', () => {
    expect(isEditionStatus('cancelled')).toBe(false);
    expect(isEditionStatus(3)).toBe(false);
    expect(isEditionStatus(null)).toBe(false);
  });
});

describe('createEditionInputSchema', () => {
  it('accepts an edition without an explicit interval', () => {
    expect(createEditionInputSchema.safeParse(edition()).success).toBe(true);
  });

  it('refuses an interval outside the range a loop can take', () => {
    for (const intervalMinutes of [0, 241, 60.5]) {
      expect(createEditionInputSchema.safeParse(edition({ intervalMinutes })).success).toBe(false);
    }
    expect(createEditionInputSchema.safeParse(edition({ intervalMinutes: 1 })).success).toBe(true);
    expect(createEditionInputSchema.safeParse(edition({ intervalMinutes: 240 })).success).toBe(
      true,
    );
  });

  it('needs a timestamp carrying its offset, not a bare date', () => {
    expect(createEditionInputSchema.safeParse(edition({ startsAt: '2026-09-19' })).success).toBe(
      false,
    );
  });

  it('refuses an empty trace', () => {
    expect(createEditionInputSchema.safeParse(edition({ gpxXml: '' })).success).toBe(false);
  });
});

describe('updateEditionInputSchema', () => {
  it('drops the slug, which the path carries, and lets the trace stay as it is', () => {
    expect(
      updateEditionInputSchema.safeParse({ displayName: 'Lépin 2026', startsAt, endsAt }).success,
    ).toBe(true);
  });
});

describe('editionStatusUpdateSchema', () => {
  it('accepts each state and refuses one the race does not have', () => {
    expect(editionStatusUpdateSchema.safeParse({ status: 'live' }).success).toBe(true);
    expect(editionStatusUpdateSchema.safeParse({ status: 'cancelled' }).success).toBe(false);
  });
});
