import { beforeEach, describe, expect, it } from 'vitest';
import { truncateAllTables } from '../../../test/database-utils';
import { getDatabase } from '../database/client';
import {
  countTableRows,
  findEntity,
  listEntities,
  listRelationsTouching,
  listSlugsLinkingTo,
} from './memory.repository';
import { searchAliases, searchEntities } from './memory-search.repository';
import { runReadOnlyQuery } from './memory-sql.repository';
import {
  didInsertAlias,
  insertEntity,
  insertRelation,
  moveSlugEverywhere,
  runInMemoryTransaction,
} from './memory-write.repository';

const NOW = new Date('2026-10-16T08:00:00Z');
const ALICE = 'second-brain/personnes/alice-martin';
const ACME = 'second-brain/organisations/acme';

async function insertPage(slug: string, title: string, body: string): Promise<void> {
  await insertEntity(getDatabase(), {
    slug,
    kind: 'personne',
    title,
    body,
    attributes: '{}',
    createdAt: NOW,
    updatedAt: NOW,
  });
}

// @FollowsBlueprint test-repository-integration
describe('memory repositories', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('adds an alias once and reports the second insertion as a no-op', async () => {
    const alias = {
      entitySlug: ALICE,
      kind: 'name',
      normalizedValue: 'alice martin',
      value: 'Alice Martin',
    };
    expect(await didInsertAlias(getDatabase(), alias)).toBe(true);
    expect(await didInsertAlias(getDatabase(), alias)).toBe(false);
    expect(await countTableRows('memory_alias')).toBe(1);
  });

  it('finds an entity by an accent- and case-insensitive pattern on its title or alias', async () => {
    await insertPage(ALICE, 'Élodie Martin', '# Élodie');
    await didInsertAlias(getDatabase(), {
      entitySlug: ALICE,
      kind: 'alias',
      normalizedValue: 'lolo',
      value: 'LOLO',
    });
    expect((await searchEntities('%elodie%', 10)).map((row) => row.slug)).toEqual([ALICE]);
    expect((await searchAliases('%lolo%', 10)).map((row) => row.entitySlug)).toEqual([ALICE]);
  });

  it('moves a slug in every table and rewrites the wikilinks pointing at it', async () => {
    await insertPage(ALICE, 'Alice Martin', '# Alice');
    await insertPage(ACME, 'Acme', 'Cliente : [[second-brain/personnes/alice-martin|Alice]]');
    await insertRelation(getDatabase(), {
      fromSlug: ACME,
      verb: 'client',
      toSlug: ALICE,
      position: 0,
      createdAt: NOW,
    });
    const renamed = 'second-brain/personnes/alice-durand';
    await runInMemoryTransaction(async (executor) => {
      await moveSlugEverywhere(executor, ALICE, renamed);
    });
    expect(await findEntity(getDatabase(), ALICE)).toBeNull();
    expect((await findEntity(getDatabase(), ACME))?.body).toBe(`Cliente : [[${renamed}|Alice]]`);
    expect((await listRelationsTouching(renamed)).map((row) => row.toSlug)).toEqual([renamed]);
    expect(await listSlugsLinkingTo(renamed)).toEqual([ACME]);
    expect((await listEntities()).map((row) => row.slug)).toEqual([renamed, ACME].toSorted());
  });

  it('answers a select with its columns and rows inside a read-only transaction', async () => {
    await insertPage(ALICE, 'Alice Martin', '');
    const answer = await runReadOnlyQuery('SELECT slug, title FROM memory_entity', 10_000);
    expect(answer).toEqual({ columns: ['slug', 'title'], rows: [[ALICE, 'Alice Martin']] });
  });

  it('refuses a write inside the read-only transaction', async () => {
    await expect(
      runReadOnlyQuery("INSERT INTO memory_verb VALUES ('ami_de', '', 'short')", 10_000),
    ).rejects.toMatchObject({ code: '25006' });
  });
});
