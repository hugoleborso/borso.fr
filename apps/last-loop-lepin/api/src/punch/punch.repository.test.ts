import { beforeEach, describe, expect, it } from 'vitest';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { makeEdition, makePunch, makeRunner } from '../../../test/fixtures';
import { insertEdition } from '../edition/edition.repository';
import { insertRunner } from '../runner/runner.repository';
import {
  findActivePunchForLoop,
  findPunchById,
  insertManualDidNotFinish,
  insertPunch,
  listManualDidNotFinishesForEdition,
  listPunchesForEdition,
  markPunchCorrected,
  markPunchVoided,
} from './punch.repository';

describe('punch.repository', () => {
  beforeEach(async () => {
    const database = testDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'live' }));
    await insertRunner(database, makeRunner('alice'));
  });

  it('round-trips a punch via insert + listPunchesForEdition', async () => {
    const database = testDatabase();
    const punch = makePunch('alice', 1, '2026-09-19T06:55:00+02:00');
    await insertPunch(database, punch);
    const found = await listPunchesForEdition(database, 'lepin-2026');
    expect(found).toHaveLength(1);
    expect(found[0]?.runnerSlug).toBe('alice');
  });

  it('findActivePunchForLoop skips voided punches', async () => {
    const database = testDatabase();
    const punch = makePunch('alice', 1, '2026-09-19T06:55:00+02:00');
    await insertPunch(database, punch);
    await markPunchVoided(database, punch.id, new Date('2026-09-19T07:00:00+02:00'));
    const active = await findActivePunchForLoop(database, 'lepin-2026', 'alice', 1);
    expect(active).toBeNull();
  });

  it('findPunchById returns the row', async () => {
    const database = testDatabase();
    const punch = makePunch('alice', 1, '2026-09-19T06:55:00+02:00');
    await insertPunch(database, punch);
    const found = await findPunchById(database, punch.id);
    expect(found?.id).toBe(punch.id);
  });

  it('markPunchCorrected updates finishedAt + correctedAt', async () => {
    const database = testDatabase();
    const punch = makePunch('alice', 1, '2026-09-19T06:55:00+02:00');
    await insertPunch(database, punch);
    const newFinishedAt = new Date('2026-09-19T06:54:30+02:00');
    const correctedAt = new Date('2026-09-19T07:01:00+02:00');
    await markPunchCorrected(database, punch.id, newFinishedAt, correctedAt);
    const found = await findPunchById(database, punch.id);
    expect(found?.correctedAt).not.toBeNull();
    expect(found?.finishedAt.toISOString()).toBe(newFinishedAt.toISOString());
  });

  it('insertManualDidNotFinish + listManualDidNotFinishesForEdition', async () => {
    const database = testDatabase();
    await insertManualDidNotFinish(database, {
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      outAtLoop: 1,
      reason: 'late',
      decidedAt: new Date('2026-09-19T07:01:00+02:00'),
    });
    const didNotFinishes = await listManualDidNotFinishesForEdition(database, 'lepin-2026');
    expect(didNotFinishes).toHaveLength(1);
    expect(didNotFinishes[0]?.reason).toBe('late');
  });
});
