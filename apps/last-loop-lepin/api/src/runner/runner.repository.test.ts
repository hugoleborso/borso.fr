import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { makeEdition, makeRunner } from '../../../test/fixtures';
import { insertEdition } from '../edition/edition.repository';
import { findRunner, insertRunner, listRunnersForEdition } from './runner.repository';

// @FollowsBlueprint test-repository-integration
describe('runner.repository', () => {
  beforeEach(async () => {
    await truncateAllTables();
    await insertEdition(makeEdition({ status: 'setup' }));
  });

  it('insertRunner + findRunner round-trip', async () => {
    await insertRunner(makeRunner('alice'));
    const found = await findRunner('lepin-2026', 'alice');
    expect(found?.slug).toBe('alice');
  });

  it('findRunner returns null on unknown slug', async () => {
    const found = await findRunner('lepin-2026', 'ghost');
    expect(found).toBeNull();
  });

  it('listRunnersForEdition returns the roster scoped to the edition', async () => {
    await insertRunner(makeRunner('alice'));
    await insertRunner(makeRunner('bob'));
    const roster = await listRunnersForEdition('lepin-2026');
    expect(roster.map((entry) => entry.slug).toSorted()).toEqual(['alice', 'bob']);
  });
});
