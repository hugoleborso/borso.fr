import { beforeEach, describe, expect, it } from 'vitest';
import { getDatabase } from '../database/client';
import { truncateAllTables } from '../../../test/database-utils';
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

/**
 * @Blueprint test-repository-integration
 * @BlueprintName Repository Integration Test
 * @BlueprintUsage Use for a repository or a service. Drive it against the real database with no HTTP transport in the way.
 * @BlueprintDescription Truncates every table and re-inserts the edition and the runner each punch row refers to, because the database enforces no foreign key here, then calls the repository functions directly and asserts on the rows they return, so a failure names a query rather than a route.
 */
describe('punch.repository', () => {
  beforeEach(async () => {
    await truncateAllTables();
    await insertEdition(makeEdition({ status: 'live' }));
    await insertRunner(makeRunner('alice'));
  });

  it('round-trips a punch via insert + listPunchesForEdition', async () => {
    const punch = makePunch({
      runnerSlug: 'alice',
      loopIndex: 1,
      finishedAtIso: '2026-09-19T06:55:00+02:00',
    });
    await insertPunch(getDatabase(), punch);
    const found = await listPunchesForEdition('lepin-2026');
    expect(found).toHaveLength(1);
    expect(found[0]?.runnerSlug).toBe('alice');
  });

  it('findActivePunchForLoop skips voided punches', async () => {
    const punch = makePunch({
      runnerSlug: 'alice',
      loopIndex: 1,
      finishedAtIso: '2026-09-19T06:55:00+02:00',
    });
    await insertPunch(getDatabase(), punch);
    await markPunchVoided(punch.id, new Date('2026-09-19T07:00:00+02:00'));
    const active = await findActivePunchForLoop('lepin-2026', 'alice', 1);
    expect(active).toBeNull();
  });

  it('findPunchById returns the row', async () => {
    const punch = makePunch({
      runnerSlug: 'alice',
      loopIndex: 1,
      finishedAtIso: '2026-09-19T06:55:00+02:00',
    });
    await insertPunch(getDatabase(), punch);
    const found = await findPunchById(punch.id);
    expect(found?.id).toBe(punch.id);
  });

  it('markPunchCorrected updates finishedAt + correctedAt', async () => {
    const punch = makePunch({
      runnerSlug: 'alice',
      loopIndex: 1,
      finishedAtIso: '2026-09-19T06:55:00+02:00',
    });
    await insertPunch(getDatabase(), punch);
    const newFinishedAt = new Date('2026-09-19T06:54:30+02:00');
    const correctedAt = new Date('2026-09-19T07:01:00+02:00');
    await markPunchCorrected(punch.id, newFinishedAt, correctedAt);
    const found = await findPunchById(punch.id);
    expect(found?.correctedAt).not.toBeNull();
    expect(found?.finishedAt.toISOString()).toBe(newFinishedAt.toISOString());
  });

  it('insertManualDidNotFinish + listManualDidNotFinishesForEdition', async () => {
    await insertManualDidNotFinish({
      editionSlug: 'lepin-2026',
      runnerSlug: 'alice',
      outAtLoop: 1,
      reason: 'late',
      decidedAt: new Date('2026-09-19T07:01:00+02:00'),
    });
    const didNotFinishes = await listManualDidNotFinishesForEdition('lepin-2026');
    expect(didNotFinishes).toHaveLength(1);
    expect(didNotFinishes[0]?.reason).toBe('late');
  });
});
