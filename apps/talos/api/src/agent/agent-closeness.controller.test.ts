import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, TEST_SECRETS } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';

const MAC = { authorization: `Bearer ${TEST_SECRETS['agent-token-mac'] ?? ''}` };
const PERSON = 'second-brain/personnes/basile-fontaine';
const DOMAIN = 'second-brain/domaines/jardin';
const PERSON_UPSERT = { op: 'entity.upsert', slug: PERSON, kind: 'personne', title: 'Basile' };
const DOMAIN_UPSERT = { op: 'entity.upsert', slug: DOMAIN, kind: 'domaine', title: 'Jardin' };
const REFUSAL = { error: `proximité 0 réservée au type personne : ${DOMAIN}` };

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
    entities: exported.tables.memory_entity.map(({ slug, kind, closeness, version }) => ({
      slug,
      kind,
      closeness,
      version,
    })),
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

  it('refuses a 0 on a new domain and writes nothing, the person of the same call included', async () => {
    const response = await postChanges([PERSON_UPSERT, { ...DOMAIN_UPSERT, closeness: 0 }]);
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual(REFUSAL);
    expect(await readStored()).toStrictEqual({ entities: [], eventCount: 0 });
  });

  it('accepts a 0 on a stored person and refuses it on a stored domain, which keeps its score', async () => {
    await postChanges([
      { ...PERSON_UPSERT, closeness: 3 },
      { ...DOMAIN_UPSERT, closeness: 3 },
    ]);
    expect((await postChanges([{ ...PERSON_UPSERT, closeness: 0 }])).status).toBe(200);
    const refused = await postChanges([{ ...DOMAIN_UPSERT, closeness: 0 }]);
    expect(refused.status).toBe(400);
    expect(await refused.json()).toStrictEqual(REFUSAL);
    expect((await postChanges([{ ...DOMAIN_UPSERT, closeness: 1 }])).status).toBe(200);
    expect(await readStored()).toStrictEqual({
      entities: [
        { slug: PERSON, kind: 'personne', closeness: 0, version: 2 },
        { slug: DOMAIN, kind: 'domaine', closeness: 1, version: 2 },
      ],
      eventCount: 4,
    });
  });

  it('reads the kind off the operation, not off the stored row', async () => {
    await postChanges([PERSON_UPSERT, DOMAIN_UPSERT]);
    const asDomain = await postChanges([{ ...PERSON_UPSERT, kind: 'domaine', closeness: 0 }]);
    expect(asDomain.status).toBe(400);
    const asPerson = await postChanges([{ ...DOMAIN_UPSERT, kind: 'personne', closeness: 0 }]);
    expect(asPerson.status).toBe(200);
  });
});
