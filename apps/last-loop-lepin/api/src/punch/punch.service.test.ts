import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { makeEdition, makeRunner } from '../../../test/fixtures';
import { insertEdition } from '../edition/edition.repository';
import { insertRunner } from '../runner/runner.repository';
import {
  correctPunch,
  PunchConflictError,
  PunchRejectedError,
  recordManualDidNotFinish,
  registerPunch,
  registerSelfPunch,
  voidPunch,
} from './punch.service';

// @FollowsBlueprint test-repository-integration
describe('punch.service', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    await truncateAllTables();
    await insertEdition(makeEdition({ status: 'live' }));
    await insertRunner(makeRunner('alice'));
  });

  it('rejects punches before the race starts', async () => {
    vi.setSystemTime(new Date('2026-09-19T05:30:00+02:00'));
    await expect(
      registerPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date()),
    ).rejects.toBeInstanceOf(PunchRejectedError);
  });

  it('persists a valid punch with loop_index 1', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const punch = await registerPunch(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice' },
      new Date(),
    );
    expect(punch.loopIndex).toBe(1);
    expect(punch.voidedAt).toBeNull();
  });

  it('throws PunchConflictError on second punch for the same loop', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    await registerPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date());
    await expect(
      registerPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date()),
    ).rejects.toBeInstanceOf(PunchConflictError);
  });

  it('void + correct: marks the rows accordingly', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const punch = await registerPunch(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice' },
      new Date(),
    );
    const corrected = await correctPunch(
      punch.id,
      '2026-09-19T06:31:00+02:00',
      new Date('2026-09-19T06:35:00+02:00'),
    );
    expect(corrected.correctedAt).not.toBeNull();
    const voided = await voidPunch(punch.id, new Date('2026-09-19T06:40:00+02:00'));
    expect(voided.voidedAt).not.toBeNull();
  });

  it('records a manual DNF', async () => {
    const didNotFinish = await recordManualDidNotFinish(
      { editionSlug: 'lepin-2026', runnerSlug: 'alice', outAtLoop: 1, reason: 'manual' },
      new Date('2026-09-19T07:01:00+02:00'),
    );
    expect(didNotFinish.reason).toBe('manual');
  });

  const FIFTY_SIX_METRES_NORTH_OF_TRACK_START = { lat: 45.5505, lng: 5.78 };
  const ONE_KILOMETRE_NORTH_OF_TRACK_START = { lat: 45.56, lng: 5.78 };

  it('self-punch: persists a punch with source=self and the metadata fields', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const punch = await registerSelfPunch(
      {
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        clientLat: FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lat,
        clientLng: FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lng,
        clientAccuracyM: 12,
      },
      'Mozilla/5.0 Test',
      new Date(),
    );
    expect(punch.source).toBe('self');
    expect(punch.clientLat).toBe(FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lat);
    expect(punch.clientLng).toBe(FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lng);
    expect(punch.clientAccuracyM).toBe(12);
    expect(punch.distanceFromCenterM).not.toBeNull();
    expect(punch.distanceFromCenterM).toBeLessThan(100);
    expect(punch.userAgent).toBe('Mozilla/5.0 Test');
    expect(punch.loopIndex).toBe(1);
  });

  it('self-punch: records distance metadata when coordinates are provided (no longer used for rejection)', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const punch = await registerSelfPunch(
      {
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        clientLat: ONE_KILOMETRE_NORTH_OF_TRACK_START.lat,
        clientLng: ONE_KILOMETRE_NORTH_OF_TRACK_START.lng,
        clientAccuracyM: 8,
      },
      'ua',
      new Date(),
    );
    expect(punch.source).toBe('self');
    expect(punch.distanceFromCenterM).not.toBeNull();
  });

  it('self-punch: accepts null coordinates (geoloc removed from the client flow)', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const punch = await registerSelfPunch(
      {
        editionSlug: 'lepin-2026',
        runnerSlug: 'alice',
        clientLat: null,
        clientLng: null,
        clientAccuracyM: null,
      },
      'ua',
      new Date(),
    );
    expect(punch.source).toBe('self');
    expect(punch.distanceFromCenterM).toBeNull();
    expect(punch.clientLat).toBeNull();
  });

  it('self-punch: rejects before the race starts', async () => {
    vi.setSystemTime(new Date('2026-09-19T05:30:00+02:00'));
    await expect(
      registerSelfPunch(
        {
          editionSlug: 'lepin-2026',
          runnerSlug: 'alice',
          clientLat: FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lat,
          clientLng: FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lng,
          clientAccuracyM: null,
        },
        null,
        new Date(),
      ),
    ).rejects.toMatchObject({ name: 'PunchRejectedError', reason: 'race-not-started' });
  });

  it('self-punch: conflicts with an existing admin punch on the same loop', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    await registerPunch({ editionSlug: 'lepin-2026', runnerSlug: 'alice' }, new Date());
    await expect(
      registerSelfPunch(
        {
          editionSlug: 'lepin-2026',
          runnerSlug: 'alice',
          clientLat: FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lat,
          clientLng: FIFTY_SIX_METRES_NORTH_OF_TRACK_START.lng,
          clientAccuracyM: null,
        },
        null,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(PunchConflictError);
  });
});
