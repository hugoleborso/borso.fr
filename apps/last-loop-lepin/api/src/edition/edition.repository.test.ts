import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { makeEdition } from '../../../test/fixtures';
import {
  findEditionBySlug,
  insertEdition,
  listEditions,
  updateEditionStatus,
} from './edition.repository';

// @FollowsBlueprint test-repository-integration
describe('edition.repository', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('insertEdition + findEditionBySlug round-trip', async () => {
    await insertEdition(makeEdition());
    const found = await findEditionBySlug('lepin-2026');
    expect(found?.slug).toBe('lepin-2026');
    expect(found?.intervalMinutes).toBe(60);
    expect(found?.gpx.distanceMeters).toBeGreaterThan(0);
  });

  it('findEditionBySlug returns null on unknown slug', async () => {
    const found = await findEditionBySlug('nope');
    expect(found).toBeNull();
  });

  it('listEditions returns all rows', async () => {
    await insertEdition(makeEdition({ slug: 'lepin-a' }));
    await insertEdition(makeEdition({ slug: 'lepin-b' }));
    const list = await listEditions();
    expect(list.map((entry) => entry.slug).toSorted()).toEqual(['lepin-a', 'lepin-b']);
  });

  it('updateEditionStatus changes the row', async () => {
    await insertEdition(makeEdition({ status: 'setup' }));
    await updateEditionStatus('lepin-2026', 'live');
    const reloaded = await findEditionBySlug('lepin-2026');
    expect(reloaded?.status).toBe('live');
  });

  it('persists pointTimeFractions when present and round-trips it', async () => {
    await insertEdition(
      makeEdition({
        slug: 'lepin-ttf-roundtrip',
        gpx: {
          distanceMeters: 5_800,
          elevationGainMeters: 250,
          trackJson: {
            points: [
              { lat: 45.55, lng: 5.78 },
              { lat: 45.555, lng: 5.785 },
              { lat: 45.56, lng: 5.79 },
            ],
            pointTimeFractions: [0, 0.4, 1],
          },
          startLatLng: { lat: 45.55, lng: 5.78 },
        },
      }),
    );
    const found = await findEditionBySlug('lepin-ttf-roundtrip');
    expect(found?.gpx.trackJson.pointTimeFractions).toEqual([0, 0.4, 1]);
  });

  it('absent pointTimeFractions stays undefined after a write→read cycle (no `null` leak)', async () => {
    await insertEdition(
      makeEdition({
        slug: 'lepin-ttf-absent',
        gpx: {
          distanceMeters: 5_800,
          elevationGainMeters: 250,
          trackJson: { points: [{ lat: 45.55, lng: 5.78 }] },
          startLatLng: { lat: 45.55, lng: 5.78 },
        },
      }),
    );
    const found = await findEditionBySlug('lepin-ttf-absent');
    expect(found?.gpx.trackJson.pointTimeFractions).toBeUndefined();
  });

  it('persists pointElevations when present and round-trips it', async () => {
    await insertEdition(
      makeEdition({
        slug: 'lepin-ele-roundtrip',
        gpx: {
          distanceMeters: 5_800,
          elevationGainMeters: 250,
          trackJson: {
            points: [
              { lat: 45.55, lng: 5.78 },
              { lat: 45.555, lng: 5.785 },
              { lat: 45.56, lng: 5.79 },
            ],
            pointElevations: [400, 450, 500],
          },
          startLatLng: { lat: 45.55, lng: 5.78 },
        },
      }),
    );
    const found = await findEditionBySlug('lepin-ele-roundtrip');
    expect(found?.gpx.trackJson.pointElevations).toEqual([400, 450, 500]);
  });

  it('absent pointElevations stays undefined after a write→read cycle (no `null` leak)', async () => {
    await insertEdition(
      makeEdition({
        slug: 'lepin-ele-absent',
        gpx: {
          distanceMeters: 5_800,
          elevationGainMeters: 250,
          trackJson: { points: [{ lat: 45.55, lng: 5.78 }] },
          startLatLng: { lat: 45.55, lng: 5.78 },
        },
      }),
    );
    const found = await findEditionBySlug('lepin-ele-absent');
    expect(found?.gpx.trackJson.pointElevations).toBeUndefined();
  });
});
