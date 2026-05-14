import { beforeEach, describe, expect, it } from 'vitest';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { insertEdition } from '../edition/edition.repository';
import { makeEdition } from '../../../test/fixtures';
import {
  RunnerAlreadyExistsError,
  RunnerNotFoundError,
  createRunner,
  getRunner,
  listRunners,
} from './runner.service';

describe('runner.service', () => {
  beforeEach(async () => {
    const database = freshDatabase();
    await truncateAllTables(database);
    await insertEdition(database, makeEdition({ status: 'setup' }));
  });

  it('createRunner inserts + listRunners returns it', async () => {
    const database = freshDatabase();
    const runner = await createRunner(database, {
      editionSlug: 'lepin-2026',
      slug: 'alice',
      displayName: 'Alice',
      bib: 1,
    });
    expect(runner.slug).toBe('alice');
    const list = await listRunners(database, 'lepin-2026');
    expect(list).toHaveLength(1);
  });

  it('createRunner defaults photoKey + bib to null', async () => {
    const database = freshDatabase();
    const runner = await createRunner(database, {
      editionSlug: 'lepin-2026',
      slug: 'bob',
      displayName: 'Bob',
    });
    expect(runner.photoKey).toBeNull();
    expect(runner.bib).toBeNull();
  });

  it('createRunner throws RunnerAlreadyExistsError on duplicate slug', async () => {
    const database = freshDatabase();
    await createRunner(database, {
      editionSlug: 'lepin-2026',
      slug: 'carla',
      displayName: 'Carla',
    });
    await expect(
      createRunner(database, {
        editionSlug: 'lepin-2026',
        slug: 'carla',
        displayName: 'Carla again',
      }),
    ).rejects.toBeInstanceOf(RunnerAlreadyExistsError);
  });

  it('getRunner throws RunnerNotFoundError on unknown slug', async () => {
    await expect(getRunner(freshDatabase(), 'lepin-2026', 'ghost')).rejects.toBeInstanceOf(
      RunnerNotFoundError,
    );
  });
});
