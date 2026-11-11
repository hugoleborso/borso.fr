import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';
import { seedMemoryInDatabase } from '../../../test/memory-fixture';

beforeEach(async () => {
  await truncateAllTables();
});

// @FollowsBlueprint test-back-e2e
describe('GET /api/graph', () => {
  it('refuses a date that is not one', async () => {
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/graph?date=mars', { cookie: await signIn() });
    expect(response.status).toBe(400);
  });

  it('draws the stored entities, commitments and relations at a date', async () => {
    await seedMemoryInDatabase();
    const { app } = buildTestContext();
    const response = await requestJson(app, '/api/graph?date=2026-10-16', {
      cookie: await signIn(),
    });
    const graph: { nodes: { id: string; type: string }[]; edges: { relation: string }[] } =
      await response.json();
    expect(graph.nodes.map((node) => `${node.type} ${node.id}`)).toEqual([
      'domaine second-brain/domaines/jardin',
      'moi second-brain/hugo',
      'organisation second-brain/organisations/acme',
      'personne second-brain/personnes/alice-martin',
      'projet second-brain/projets/compost',
      'projet second-brain/projets/potager',
      'projet second-brain/projets/serre',
      'projet second-brain/projets/verger',
      'engagement engagements/2026-09-01-ancien',
      'engagement engagements/2026-10-07-devis-acme',
    ]);
    expect(graph.edges.filter((edge) => edge.relation !== 'comprend')).toEqual([
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
