import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { makeEdition } from '../../../test/fixtures';
import { insertEdition } from '../edition/edition.repository';
import {
  createRunner,
  getRunner,
  listRunners,
  RunnerAlreadyExistsError,
  RunnerNotFoundError,
} from './runner.service';

// @FollowsBlueprint test-repository-integration
describe('runner.service', () => {
  beforeEach(async () => {
    await truncateAllTables();
    await insertEdition(makeEdition({ status: 'setup' }));
  });

  it('createRunner inserts + listRunners returns it', async () => {
    const runner = await createRunner({
      editionSlug: 'lepin-2026',
      slug: 'alice',
      displayName: 'Alice',
      bib: 1,
    });
    expect(runner.slug).toBe('alice');
    const list = await listRunners('lepin-2026');
    expect(list).toHaveLength(1);
  });

  it('createRunner defaults photoKey + bib to null', async () => {
    const runner = await createRunner({
      editionSlug: 'lepin-2026',
      slug: 'bob',
      displayName: 'Bob',
    });
    expect(runner.photoKey).toBeNull();
    expect(runner.bib).toBeNull();
  });

  it('createRunner throws RunnerAlreadyExistsError on duplicate slug', async () => {
    await createRunner({
      editionSlug: 'lepin-2026',
      slug: 'carla',
      displayName: 'Carla',
    });
    await expect(
      createRunner({
        editionSlug: 'lepin-2026',
        slug: 'carla',
        displayName: 'Carla again',
      }),
    ).rejects.toBeInstanceOf(RunnerAlreadyExistsError);
  });

  it('getRunner throws RunnerNotFoundError on unknown slug', async () => {
    await expect(getRunner('lepin-2026', 'ghost')).rejects.toBeInstanceOf(RunnerNotFoundError);
  });
});
