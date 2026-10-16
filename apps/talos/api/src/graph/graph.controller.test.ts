import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

interface GraphBody {
  nodes: { id: string; title: string; type: string }[];
  edges: { target: string; isClosed: boolean }[];
}

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/graph', () => {
  it('answers every page as a node and every relation as an edge', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph', { cookie: await signIn() });
    const graph: GraphBody = await response.json();
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        { id: 'second-brain/moi', title: 'Alex Durand', type: 'moi' },
        { id: 'index', title: 'Index', type: 'page' },
        { id: 'second-brain/projets/initech', title: 'initech', type: 'inconnu' },
      ]),
    );
    expect(graph.edges).toHaveLength(2);
  });

  it('keeps only the relations begun by the asked date', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph?date=2026-03-15', {
      cookie: await signIn(),
    });
    const graph: GraphBody = await response.json();
    expect(graph.edges.map((edge) => edge.target)).toEqual(['second-brain/projets/initech']);
  });

  it('marks a relation ended before the asked date as closed and carries the proximity', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph?date=2026-10-08', {
      cookie: await signIn(),
    });
    const graph: GraphBody = await response.json();
    expect(graph.edges.map((edge) => [edge.target, edge.isClosed])).toEqual([
      ['second-brain/projets/refonte', false],
      ['second-brain/projets/initech', true],
    ]);
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        {
          id: 'second-brain/projets/refonte',
          title: 'Refonte du site',
          type: 'projet',
          proximity: 4,
        },
      ]),
    );
  });

  it('refuses a date that is not one', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph?date=mars', { cookie: await signIn() });
    expect(response.status).toBe(400);
  });
});

describe('the graph route once the memory is in the database', () => {
  beforeEach(async () => {
    await seedMemoryInDatabase();
  });

  it('draws the stored entities, commitments and relations at a date', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph?date=2026-10-16', {
      cookie: await signIn(),
    });
    const graph: { nodes: { id: string; type: string }[]; edges: unknown[] } =
      await response.json();
    expect(graph.nodes.map((node) => `${node.type} ${node.id}`)).toEqual([
      'moi second-brain/hugo',
      'organisation second-brain/organisations/acme',
      'personne second-brain/personnes/alice-martin',
      'engagement engagements/2026-09-01-ancien',
      'engagement engagements/2026-10-07-devis-acme',
    ]);
    expect(graph.edges).toEqual([
      {
        source: 'second-brain/personnes/alice-martin',
        target: 'second-brain/organisations/acme',
        relation: 'travaille_chez',
        since: '2026-09',
        seen: '2026-10-02',
        isClosed: false,
      },
    ]);
  });
});
