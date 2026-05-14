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
});
