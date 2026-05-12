import { beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { makeEdition } from '../../../test/fixtures';
import {
  findEditionBySlug,
  insertEdition,
  listEditions,
  updateEditionStatus,
} from './edition.repository';

describe('edition.repository', () => {
  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  it('insertEdition + findEditionBySlug round-trip', async () => {
    const database = freshDatabase();
    await insertEdition(database, makeEdition());
    const found = await findEditionBySlug(database, 'lepin-2026');
    expect(found?.slug).toBe('lepin-2026');
    expect(found?.intervalMinutes).toBe(60);
    expect(found?.gpx.distanceMeters).toBeGreaterThan(0);
  });

  it('findEditionBySlug returns null on unknown slug', async () => {
    const found = await findEditionBySlug(freshDatabase(), 'nope');
    expect(found).toBeNull();
  });

  it('listEditions returns all rows', async () => {
    const database = freshDatabase();
    await insertEdition(database, makeEdition({ slug: 'lepin-a' }));
    await insertEdition(database, makeEdition({ slug: 'lepin-b' }));
    const list = await listEditions(database);
    expect(list.map((entry) => entry.slug).toSorted()).toEqual(['lepin-a', 'lepin-b']);
  });

  it('updateEditionStatus changes the row', async () => {
    const database = freshDatabase();
    await insertEdition(database, makeEdition({ status: 'setup' }));
    await updateEditionStatus(database, 'lepin-2026', 'live');
    const reloaded = await findEditionBySlug(database, 'lepin-2026');
    expect(reloaded?.status).toBe('live');
  });
});
