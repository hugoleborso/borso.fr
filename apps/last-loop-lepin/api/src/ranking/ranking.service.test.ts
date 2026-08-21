import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import { makeEdition, makePunch, makeRunner } from '../../../test/fixtures';
import { insertEdition } from '../edition/edition.repository';
import { EditionNotFoundError } from '../edition/edition.service';
import { insertPunch } from '../punch/punch.repository';
import { insertRunner } from '../runner/runner.repository';
import { computeStandingsForEdition } from './ranking.service';

// @FollowsBlueprint test-repository-integration
describe('ranking.service', () => {
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
    await insertRunner(makeRunner('bob'));
  });

  it('throws EditionNotFoundError when the edition is unknown', async () => {
    await expect(computeStandingsForEdition('nope', new Date())).rejects.toBeInstanceOf(
      EditionNotFoundError,
    );
  });

  it('returns a Standings with the configured runners', async () => {
    vi.setSystemTime(new Date('2026-09-19T06:30:00+02:00'));
    const standings = await computeStandingsForEdition('lepin-2026', new Date());
    expect(standings.ranked).toHaveLength(2);
    expect(standings.editionSlug).toBe('lepin-2026');
  });

  it('orders survivors before DNF runners', async () => {
    await insertPunch(getDatabase(), makePunch('alice', 1, '2026-09-19T06:55:00+02:00'));
    await insertPunch(getDatabase(), makePunch('alice', 2, '2026-09-19T07:55:00+02:00'));

    vi.setSystemTime(new Date('2026-09-19T08:30:00+02:00'));
    const standings = await computeStandingsForEdition('lepin-2026', new Date());
    expect(standings.ranked[0]?.runner.slug).toBe('alice');
    expect(standings.ranked[0]?.status.kind).toBe('in-race');
    expect(standings.ranked[1]?.status.kind).toBe('dnf');
  });
});
