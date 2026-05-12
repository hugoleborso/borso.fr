import { beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { insertEdition } from '../edition/edition.repository';
import { makeEdition, makeRunner } from '../../../test/fixtures';
import { findRunner, insertRunner, listRunnersForEdition } from './runner.repository';

describe('runner.repository', () => {
  beforeEach(async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'setup' }));
  });

  it('insertRunner + findRunner round-trip', async () => {
    const database = freshDatabase();
    await insertRunner(database, makeRunner('alice'));
    const found = await findRunner(database, 'lepin-2026', 'alice');
    expect(found?.slug).toBe('alice');
  });

  it('findRunner returns null on unknown slug', async () => {
    const found = await findRunner(freshDatabase(), 'lepin-2026', 'ghost');
    expect(found).toBeNull();
  });

  it('listRunnersForEdition returns the roster scoped to the edition', async () => {
    const database = freshDatabase();
    await insertRunner(database, makeRunner('alice'));
    await insertRunner(database, makeRunner('bob'));
    const roster = await listRunnersForEdition(database, 'lepin-2026');
    expect(roster.map((entry) => entry.slug).toSorted()).toEqual(['alice', 'bob']);
  });
});
