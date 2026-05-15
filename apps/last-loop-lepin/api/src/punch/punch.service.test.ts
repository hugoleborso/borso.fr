import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { insertEdition } from '../edition/edition.repository';
import { insertRunner } from '../runner/runner.repository';
import { makeEdition, makeRunner } from '../../../test/fixtures';
import { PunchConflictError } from './punch.repository';
import {
  PunchRejectedError,
  correctPunch,
  recordManualDnf,
  registerPunch,
  registerSelfPunch,
  voidPunch,
} from './punch.service';

describe('punch.service', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'live' }));
    await insertRunner(database, makeRunner('alice'));
  });

  it('rejects punches before the race starts', async () => {
    vi.setSystemTime(new Date('2026-09-19T05:30:00+02:00'));
    const database = freshDatabase();
    await expect(
      registerPunch(database, { editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date()),
    ).rejects.toBeInstanceOf(PunchRejectedError);
  });

  it('persists a valid punch with loop_index 1', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const database = freshDatabase();
    const punch = await registerPunch(
      database,
      { editionSlug: 'lepin-2026', runnerSlug: 'alice' },
      new Date(),
    );
    expect(punch.loopIndex).toBe(1);
    expect(punch.voidedAt).toBeNull();
  });

  it('throws PunchConflictError on second punch for the same loop', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const database = freshDatabase();
    await registerPunch(database, { editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date());
    await expect(
      registerPunch(database, { editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date()),
    ).rejects.toBeInstanceOf(PunchConflictError);
  });

  it('void + correct: marks the rows accordingly', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const database = freshDatabase();
    const punch = await registerPunch(
      database,
      { editionSlug: 'lepin-2026', runnerSlug: 'alice' },
      new Date(),
    );
    const corrected = await correctPunch(
      database,
      punch.id,
      new Date('2026-09-19T06:31:00+02:00'),
      new Date('2026-09-19T06:35:00+02:00'),
    );
    expect(corrected.correctedAt).not.toBeNull();
    const voided = await voidPunch(database, punch.id, new Date('2026-09-19T06:40:00+02:00'));
    expect(voided.voidedAt).not.toBeNull();
  });

  it('records a manual DNF', async () => {
    const database = freshDatabase();
    const dnf = await recordManualDnf(
      database,
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', outAtLoop: 1, reason: 'manual' },
      new Date('2026-09-19T07:01:00+02:00'),
    );
    expect(dnf.reason).toBe('manual');
  });

  // Geofence centre per makeEdition: { lat: 45.55, lng: 5.78 }. The intra-100m
  // point shifts latitude by ~0.0005°, ~56 m at this latitude — well inside
  // the 100 m radius. The out-of-zone point shifts by 0.01°, ~1.1 km — far
  // outside.
  const IN_ZONE = { lat: 45.5505, lng: 5.78 };
  const OUT_OF_ZONE = { lat: 45.56, lng: 5.78 };

  it('self-punch: persists a punch with source=self and the metadata fields', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const database = freshDatabase();
    const punch = await registerSelfPunch(
      database,
      {
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        clientLat: IN_ZONE.lat,
        clientLng: IN_ZONE.lng,
        clientAccuracyM: 12,
      },
      'Mozilla/5.0 Test',
      new Date(),
    );
    expect(punch.source).toBe('self');
    expect(punch.clientLat).toBe(IN_ZONE.lat);
    expect(punch.clientLng).toBe(IN_ZONE.lng);
    expect(punch.clientAccuracyM).toBe(12);
    expect(punch.distanceFromCenterM).not.toBeNull();
    expect(punch.distanceFromCenterM).toBeLessThan(100);
    expect(punch.userAgent).toBe('Mozilla/5.0 Test');
    expect(punch.loopIndex).toBe(1);
  });

  it('self-punch: rejects positions outside the 100 m geofence', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const database = freshDatabase();
    await expect(
      registerSelfPunch(
        database,
        {
          editionSlug: 'lepin-2026',
          runnerSlug: 'alice',
          clientLat: OUT_OF_ZONE.lat,
          clientLng: OUT_OF_ZONE.lng,
          clientAccuracyM: 8,
        },
        'ua',
        new Date(),
      ),
    ).rejects.toMatchObject({ name: 'PunchRejectedError', reason: 'out-of-zone' });
  });

  it('self-punch: rejects before the race starts', async () => {
    vi.setSystemTime(new Date('2026-09-19T05:30:00+02:00'));
    const database = freshDatabase();
    await expect(
      registerSelfPunch(
        database,
        {
          editionSlug: 'lepin-2026',
          runnerSlug: 'alice',
          clientLat: IN_ZONE.lat,
          clientLng: IN_ZONE.lng,
          clientAccuracyM: null,
        },
        null,
        new Date(),
      ),
    ).rejects.toMatchObject({ name: 'PunchRejectedError', reason: 'race-not-started' });
  });

  it('self-punch: conflicts with an existing admin punch on the same loop', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const database = freshDatabase();
    await registerPunch(database, { editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date());
    await expect(
      registerSelfPunch(
        database,
        {
          editionSlug: 'lepin-2026',
          runnerSlug: 'alice',
          clientLat: IN_ZONE.lat,
          clientLng: IN_ZONE.lng,
          clientAccuracyM: null,
        },
        null,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(PunchConflictError);
  });
});
