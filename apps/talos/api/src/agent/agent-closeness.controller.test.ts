import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, TEST_SECRETS } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';

const MAC = { authorization: `Bearer ${TEST_SECRETS['agent-token-mac'] ?? ''}` };
const PERSON = 'second-brain/personnes/basile-fontaine';
const DOMAIN = 'second-brain/domaines/jardin';
const ORGANISATION = 'second-brain/organisations/atelier-des-saules';
const PERSON_UPSERT = { op: 'entity.upsert', slug: PERSON, kind: 'personne', title: 'Basile' };
const DOMAIN_UPSERT = { op: 'entity.upsert', slug: DOMAIN, kind: 'domaine', title: 'Jardin' };
const ORGANISATION_UPSERT = {
  op: 'entity.upsert',
  slug: ORGANISATION,
  kind: 'organisation',
  title: 'Atelier des Saules',
};

interface StoredEntity {
  readonly slug: string;
  readonly kind: string;
  readonly closeness: number | null;
  readonly version: number;
}

async function postChanges(operations: unknown[]): Promise<Response> {
  const { app } = buildTestContext();
  return await requestJson(app, '/api/agent/changes', {
    method: 'POST',
    headers: MAC,
    body: { idempotencyKey: `cle-${String(Math.random())}`, actor: 'routine:nuit', operations },
  });
}

async function readStored(): Promise<{ entities: StoredEntity[]; eventCount: number }> {
  const { app } = buildTestContext();
  const response = await requestJson(app, '/api/agent/export', { headers: MAC });
  const exported: { tables: { memory_entity: StoredEntity[]; memory_event: unknown[] } } =
    await response.json();
  return {
    entities: exported.tables.memory_entity
      .map(({ slug, kind, closeness, version }) => ({ slug, kind, closeness, version }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
    eventCount: exported.tables.memory_event.length,
  };
}

async function readMarkdown(slug: string): Promise<string> {
  const { app } = buildTestContext();
  const response = await requestJson(app, `/api/agent/page?slug=${slug}`, { headers: MAC });
  const page: { markdown: string } = await response.json();
  return page.markdown;
}

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('POST /api/agent/changes, a closeness of 0', () => {
  it('stores a 0 on a person, reads it back as 0 and renders it on the page', async () => {
    const response = await postChanges([{ ...PERSON_UPSERT, closeness: 0 }]);
    expect(response.status).toBe(200);
    expect(await readStored()).toStrictEqual({
      entities: [{ slug: PERSON, kind: 'personne', closeness: 0, version: 1 }],
      eventCount: 1,
    });
    expect(await readMarkdown(PERSON)).toBe('---\ntype: personne\nproximite: 0\n---\n');
  });

  it('stores a 0 on a new organisation and on a new domain, reads it back as 0 and renders it on the page', async () => {
    const response = await postChanges([
      { ...ORGANISATION_UPSERT, closeness: 0 },
      { ...DOMAIN_UPSERT, closeness: 0 },
    ]);
    expect(response.status).toBe(200);
    expect(await readStored()).toStrictEqual({
      entities: [
        { slug: DOMAIN, kind: 'domaine', closeness: 0, version: 1 },
        { slug: ORGANISATION, kind: 'organisation', closeness: 0, version: 1 },
      ],
      eventCount: 2,
    });
    expect(await readMarkdown(ORGANISATION)).toBe('---\ntype: organisation\nproximite: 0\n---\n');
    expect(await readMarkdown(DOMAIN)).toBe('---\ntype: domaine\nproximite: 0\n---\n');
  });

  it('lowers a stored organisation and a stored domain to 0, and keeps the 0 an update leaves out', async () => {
    await postChanges([
      { ...ORGANISATION_UPSERT, closeness: 3 },
      { ...DOMAIN_UPSERT, closeness: 3 },
    ]);
    const lowered = await postChanges([
      { ...ORGANISATION_UPSERT, closeness: 0 },
      { ...DOMAIN_UPSERT, closeness: 0 },
    ]);
    expect(lowered.status).toBe(200);
    expect((await postChanges([ORGANISATION_UPSERT])).status).toBe(200);
    expect(await readStored()).toStrictEqual({
      entities: [
        { slug: DOMAIN, kind: 'domaine', closeness: 0, version: 2 },
        { slug: ORGANISATION, kind: 'organisation', closeness: 0, version: 3 },
      ],
      eventCount: 5,
    });
  });
});
