import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { createRunner, listRunners } from '../runner/runner.service';
import {
  createEdition,
  EditionAlreadyExistsError,
  EditionNotFoundError,
  getAllEditions,
  getEdition,
  removeSetupEdition,
  transitionEditionStatus,
} from './edition.service';

const MINIMAL_GPX = `<?xml version="1.0"?><gpx><trk><trkseg>
  <trkpt lat="45.55" lon="5.78"><ele>400</ele></trkpt>
  <trkpt lat="45.555" lon="5.785"><ele>500</ele></trkpt>
</trkseg></trk></gpx>`;

function input(slug = 'lepin-svc-1') {
  return {
    slug,
    displayName: 'svc test',
    startsAt: new Date('2026-09-19T06:00:00+02:00'),
    endsAt: new Date('2026-09-19T22:00:00+02:00'),
    gpxXml: MINIMAL_GPX,
  };
}

// @FollowsBlueprint test-repository-integration
describe('edition.service', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('createEdition parses GPX and computes sunrise/sunset', async () => {
    const edition = await createEdition(input());
    expect(edition.gpx.distanceMeters).toBeGreaterThan(0);
    expect(edition.sunriseAt.getTime()).toBeLessThan(edition.sunsetAt.getTime());
    expect(edition.status).toBe('setup');
  });

  it('rejects startsAt >= endsAt', async () => {
    await expect(
      createEdition({
        ...input(),
        endsAt: new Date('2026-09-19T05:00:00+02:00'),
      }),
    ).rejects.toThrow(/startsAt must precede endsAt/);
  });

  it('throws EditionAlreadyExistsError on duplicate slug', async () => {
    await createEdition(input('lepin-svc-dup'));
    await expect(createEdition(input('lepin-svc-dup'))).rejects.toBeInstanceOf(
      EditionAlreadyExistsError,
    );
  });

  it('getEdition throws EditionNotFoundError for unknown slug', async () => {
    await expect(getEdition('does-not-exist')).rejects.toBeInstanceOf(EditionNotFoundError);
  });

  it('transitionEditionStatus is a no-op when the status is already current', async () => {
    await createEdition(input('lepin-svc-status'));
    await expect(transitionEditionStatus('lepin-svc-status', 'setup')).resolves.toBeUndefined();
    const edition = await getEdition('lepin-svc-status');
    expect(edition.status).toBe('setup');
  });

  it('transitionEditionStatus moves setup → live', async () => {
    await createEdition(input('lepin-svc-go-live'));
    await transitionEditionStatus('lepin-svc-go-live', 'live');
    const edition = await getEdition('lepin-svc-go-live');
    expect(edition.status).toBe('live');
  });

  it('getAllEditions returns the row count', async () => {
    await createEdition(input('lepin-svc-a'));
    await createEdition(input('lepin-svc-b'));
    const editions = await getAllEditions();
    expect(editions.length).toBeGreaterThanOrEqual(2);
  });

  it('removeSetupEdition takes the roster with it, so the slug comes back empty', async () => {
    await createEdition(input('lepin-svc-cascade'));
    await createRunner({
      editionSlug: 'lepin-svc-cascade',
      slug: 'runner-one',
      displayName: 'Runner One',
    });
    expect(await listRunners('lepin-svc-cascade')).toHaveLength(1);

    await removeSetupEdition('lepin-svc-cascade');
    expect(await listRunners('lepin-svc-cascade')).toHaveLength(0);

    await createEdition(input('lepin-svc-cascade'));
    expect(await listRunners('lepin-svc-cascade')).toHaveLength(0);
  });

  it('removeSetupEdition refuses an edition that has already started', async () => {
    await createEdition(input('lepin-svc-live-delete'));
    await transitionEditionStatus('lepin-svc-live-delete', 'live');
    await createRunner({
      editionSlug: 'lepin-svc-live-delete',
      slug: 'runner-two',
      displayName: 'Runner Two',
    });

    await expect(removeSetupEdition('lepin-svc-live-delete')).rejects.toThrow();
    expect(await listRunners('lepin-svc-live-delete')).toHaveLength(1);
  });
});
