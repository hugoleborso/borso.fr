import { beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  EditionAlreadyExistsError,
  EditionNotFoundError,
  createEdition,
  getAllEditions,
  getEdition,
  transitionEditionStatus,
} from './edition.service';

const MINIMAL_GPX = `<?xml version="1.0"?><gpx><trk><trkseg>
  <trkpt lat="45.55" lon="5.78"><ele>400</ele></trkpt>
  <trkpt lat="45.555" lon="5.785"><ele>500</ele></trkpt>
</trkseg></trk></gpx>`;

describe('edition.service', () => {
  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  function input(slug = 'lepin-svc-1') {
    return {
      slug,
      displayName: 'svc test',
      startsAt: new Date('2026-09-19T06:00:00+02:00'),
      endsAt: new Date('2026-09-19T22:00:00+02:00'),
      gpxXml: MINIMAL_GPX,
    };
  }

  it('createEdition parses GPX and computes sunrise/sunset', async () => {
    const database = freshDatabase();
    const edition = await createEdition(database, input());
    expect(edition.gpx.distanceMeters).toBeGreaterThan(0);
    expect(edition.sunriseAt.getTime()).toBeLessThan(edition.sunsetAt.getTime());
    expect(edition.status).toBe('setup');
  });

  it('rejects startsAt >= endsAt', async () => {
    const database = freshDatabase();
    await expect(
      createEdition(database, {
        ...input(),
        endsAt: new Date('2026-09-19T05:00:00+02:00'),
      }),
    ).rejects.toThrow(/startsAt must precede endsAt/);
  });

  it('throws EditionAlreadyExistsError on duplicate slug', async () => {
    const database = freshDatabase();
    await createEdition(database, input('lepin-svc-dup'));
    await expect(createEdition(database, input('lepin-svc-dup'))).rejects.toBeInstanceOf(
      EditionAlreadyExistsError,
    );
  });

  it('getEdition throws EditionNotFoundError for unknown slug', async () => {
    await expect(getEdition(freshDatabase(), 'does-not-exist')).rejects.toBeInstanceOf(
      EditionNotFoundError,
    );
  });

  it('transitionEditionStatus is a no-op when the status is already current', async () => {
    const database = freshDatabase();
    await createEdition(database, input('lepin-svc-status'));
    await expect(
      transitionEditionStatus(database, 'lepin-svc-status', 'setup'),
    ).resolves.toBeUndefined();
    const edition = await getEdition(database, 'lepin-svc-status');
    expect(edition.status).toBe('setup');
  });

  it('transitionEditionStatus moves setup → live', async () => {
    const database = freshDatabase();
    await createEdition(database, input('lepin-svc-go-live'));
    await transitionEditionStatus(database, 'lepin-svc-go-live', 'live');
    const edition = await getEdition(database, 'lepin-svc-go-live');
    expect(edition.status).toBe('live');
  });

  it('getAllEditions returns the row count', async () => {
    const database = freshDatabase();
    await createEdition(database, input('lepin-svc-a'));
    await createEdition(database, input('lepin-svc-b'));
    const editions = await getAllEditions(database);
    expect(editions.length).toBeGreaterThanOrEqual(2);
  });
});
