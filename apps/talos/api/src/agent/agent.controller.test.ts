import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, TEST_SECRETS } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';

const MAC = { authorization: `Bearer ${TEST_SECRETS['agent-token-mac'] ?? ''}` };
const ALICE = 'second-brain/personnes/alice-martin';
const ACME = 'second-brain/organisations/acme';
const COMMITMENT = 'engagements/2026-10-05-devis-acme';

async function postChanges(operations: unknown[], idempotencyKey = `cle-${String(Math.random())}`) {
  const { app } = buildTestContext();
  return await requestJson(app, '/api/agent/changes', {
    method: 'POST',
    headers: MAC,
    body: {
      idempotencyKey,
      actor: 'routine:nuit',
      runId: 'run-1',
      summary: 'scan de nuit',
      operations,
    },
  });
}

async function getJson(path: string): Promise<unknown> {
  const { app } = buildTestContext();
  const response = await requestJson(app, path, { headers: MAC });
  return await response.json();
}

const SEED = [
  { op: 'verb.add', name: 'client', description: 'relation commerciale', linkLength: 'long' },
  {
    op: 'entity.upsert',
    slug: ALICE,
    kind: 'personne',
    title: 'Alice Martin',
    summary: 'Directrice chez Acme',
    body: '# Alice Martin\n\n## Faits\n\n## Relations\n\n',
    attributes: { type: 'personne', email: 'alice@acme.test' },
    closeness: 3,
  },
  {
    op: 'entity.upsert',
    slug: ACME,
    kind: 'organisation',
    title: 'Acme',
    body: '# Acme\n\nCliente : [[second-brain/personnes/alice-martin]]\n',
  },
  { op: 'alias.add', slug: ALICE, kind: 'alias', value: 'Élodie' },
  { op: 'fact.add', slug: ALICE, key: 'ville', value: 'Lyon', since: '2026-09' },
  { op: 'relation.add', from: ACME, verb: 'client', to: ALICE, since: '2026' },
  {
    op: 'commitment.upsert',
    slug: COMMITMENT,
    status: 'ouvert',
    action: 'Envoyer le devis',
    due: '2026-01-05',
    attributes: Object.fromEntries([
      ['type', 'engagement'],
      ['statut', 'ouvert'],
    ]),
    body: '# Devis Acme\n',
  },
  { op: 'relation.add', from: COMMITMENT, verb: 'client', to: ACME },
  {
    op: 'todo.add',
    list: 'personal',
    text: 'Envoyer le devis',
    commitmentSlug: COMMITMENT,
    id: 'a1b2c3d4e5',
  },
  { op: 'document.write', slug: 'preferences/redaction', content: 'Court.' },
  { op: 'state.set', key: 'cursors', value: { gmail: '2026-10-15' } },
  {
    op: 'source.add',
    slug: 'sources/2026/10/04/appel-acme',
    content: 'Appel Acme',
    metadata: { encodage: 'base64' },
  },
];

// @FollowsBlueprint test-back-e2e
describe('/api/agent', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('refuses a caller without a known token', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/agent/status', {
      headers: { authorization: 'Bearer faux' },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'jeton invalide' });
  });

  it('applies a batch, records one event per operation, and replays the same key without writing', async () => {
    const response = await postChanges(SEED, 'nuit-1');
    expect(response.status).toBe(200);
    const applied = await response.json();
    expect(applied).toMatchObject({
      applied: SEED.length,
      replayed: false,
      chunks: [{ from: 0, to: SEED.length - 1, committed: true }],
    });
    const replay = await (await postChanges(SEED, 'nuit-1')).json();
    expect(replay).toMatchObject({ applied: SEED.length, replayed: true });
    const status = await getJson('/api/agent/status');
    expect(status).toMatchObject({
      cutover: 'git',
      tokenName: 'mac',
      counts: {
        entities: 2,
        facts: 1,
        relations: 2,
        aliases: 1,
        commitments: 1,
        todos: 1,
        events: SEED.length,
      },
    });
  });

  it('rejects the whole call on one invalid operation, naming it', async () => {
    const response = await postChanges([SEED[0], { op: 'entity.upsert', slug: ALICE }]);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'opération invalide', operationIndex: 1 });
    expect(await getJson('/api/agent/status')).toMatchObject({ counts: { events: 0 } });
  });

  it('rejects a secret anywhere in the call', async () => {
    const response = await postChanges([
      { op: 'document.write', slug: 'etat/notes', content: 'token ghp_abcdefghijklmnopqrstu' },
    ]);
    expect(response.status).toBe(400);
  });

  it('refuses a relation with an unknown verb and an operation on a missing page, writing nothing', async () => {
    const unknownVerb = await postChanges([
      { op: 'relation.add', from: ALICE, verb: 'ami_de', to: ACME },
    ]);
    expect(unknownVerb.status).toBe(400);
    const missing = await postChanges([{ op: 'fact.add', slug: ALICE, value: 'Lyon' }]);
    expect(missing.status).toBe(404);
  });

  it('renders a page as its file, with incoming and outgoing links', async () => {
    await postChanges(SEED);
    const page = await getJson(`/api/agent/page?slug=${ALICE}`);
    expect(page).toEqual({
      slug: ALICE,
      type: 'entity',
      markdown:
        '---\ntype: personne\nemail: alice@acme.test\nproximite: 3\n---\n# Alice Martin\n\n## Faits\n\n- ville: Lyon | depuis: 2026-09\n## Relations\n\n',
      outgoing: [],
      incoming: [ACME],
    });
    expect(await getJson(`/api/agent/page?slug=${COMMITMENT}`)).toMatchObject({
      type: 'commitment',
      outgoing: [],
    });
    const { app } = buildTestContext();
    expect(
      (await requestJson(app, '/api/agent/page?slug=second-brain/nulle-part', { headers: MAC }))
        .status,
    ).toBe(404);
  });

  it('closes a fact into the history and updates a todo', async () => {
    const seeded = await (await postChanges(SEED)).json();
    const factId = seeded.results.find((result: { op: string }) => result.op === 'fact.add').id;
    await postChanges([
      { op: 'fact.close', id: factId, until: '2026-10' },
      { op: 'todo.update', id: 'a1b2c3d4e5', done: true },
      { op: 'commitment.status', slug: COMMITMENT, status: 'fait', note: 'devis envoyé' },
    ]);
    const page = await getJson(`/api/agent/page?slug=${ALICE}`);
    expect(page).toMatchObject({
      markdown: expect.stringContaining(
        "## Historique\n\n- ville: Lyon | depuis: 2026-09 | jusqu'à: 2026-10\n",
      ),
    });
    expect(await getJson('/api/agent/lint')).toMatchObject({
      issues: expect.not.arrayContaining([
        expect.objectContaining({ code: 'todo-commitment-mismatch' }),
      ]),
    });
  });

  it('searches accent- and case-insensitively, title and alias first', async () => {
    await postChanges(SEED);
    expect(await getJson('/api/agent/search?q=elodie')).toEqual({
      items: [
        {
          slug: ALICE,
          type: 'entity',
          title: 'Alice Martin',
          excerpt: 'Élodie',
          matchedIn: 'alias',
        },
      ],
    });
  });

  it('walks the graph and finds a path', async () => {
    await postChanges(SEED);
    expect(await getJson(`/api/agent/graph/neighbours?slug=${ALICE}&depth=2`)).toMatchObject({
      nodes: [{ slug: ALICE }, { slug: ACME }, { slug: COMMITMENT }],
    });
    expect(await getJson(`/api/agent/graph/path?from=${ALICE}&to=${COMMITMENT}`)).toEqual({
      path: [
        { slug: ALICE, via: null },
        { slug: ACME, via: { verb: 'client', direction: 'in' } },
        { slug: COMMITMENT, via: { verb: 'client', direction: 'in' } },
      ],
    });
  });

  it('answers a read-only select and refuses anything else', async () => {
    await postChanges(SEED);
    const { app } = buildTestContext();
    const select = await requestJson(app, '/api/agent/sql', {
      method: 'POST',
      headers: MAC,
      body: { query: 'select slug from memory_entity order by slug' },
    });
    expect(await select.json()).toEqual({
      columns: ['slug'],
      rows: [[ACME], [ALICE]],
      truncated: false,
    });
    const write = await requestJson(app, '/api/agent/sql', {
      method: 'POST',
      headers: MAC,
      body: { query: 'delete from memory_entity' },
    });
    expect(write.status).toBe(400);
    const broken = await requestJson(app, '/api/agent/sql', {
      method: 'POST',
      headers: MAC,
      body: { query: 'select nope from memory_entity' },
    });
    expect(broken.status).toBe(400);
  });

  it('serves the context, the documents, the state and the export', async () => {
    await postChanges(SEED);
    const context = await getJson('/api/agent/context?budget=100000');
    expect(context).toMatchObject({
      markdown: expect.stringContaining('### preferences/redaction\n\nCourt.'),
    });
    expect(await getJson('/api/agent/document?slug=preferences/redaction')).toEqual({
      slug: 'preferences/redaction',
      content: 'Court.',
      contentType: 'markdown',
    });
    expect(await getJson('/api/agent/state?key=cursors')).toEqual({
      key: 'cursors',
      value: { gmail: '2026-10-15' },
    });
    const exported = await getJson('/api/agent/export');
    expect(exported).toMatchObject({
      tables: { memory_state: [{ key: 'cursors', value: { gmail: '2026-10-15' } }] },
    });
    const { app } = buildTestContext();
    const compressed = await app.request('/api/agent/export', {
      headers: { ...MAC, 'Accept-Encoding': 'gzip' },
    });
    expect(compressed.headers.get('Content-Encoding')).toBe('gzip');
    expect((await requestJson(app, '/api/agent/state?key=absent', { headers: MAC })).status).toBe(
      404,
    );
    expect(
      (await requestJson(app, '/api/agent/document?slug=absent', { headers: MAC })).status,
    ).toBe(404);
  });

  it('switches the cutover flag through a state change', async () => {
    await postChanges([{ op: 'state.set', key: 'cutover', value: 'database' }]);
    expect(await getJson('/api/agent/status')).toMatchObject({ cutover: 'database' });
  });

  it('renames a page everywhere and refuses a taken slug', async () => {
    await postChanges(SEED);
    const renamed = 'second-brain/personnes/alice-durand';
    expect((await postChanges([{ op: 'entity.rename', from: ALICE, to: renamed }])).status).toBe(
      200,
    );
    expect(await getJson(`/api/agent/page?slug=${ACME}`)).toMatchObject({ outgoing: [renamed] });
    expect((await postChanges([{ op: 'entity.rename', from: renamed, to: ACME }])).status).toBe(
      409,
    );
  });
});
