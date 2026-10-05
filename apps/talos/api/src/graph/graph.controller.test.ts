import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { CONTENT_FIXTURE } from '../../../test/content-fixture';
import { truncateAllTables } from '../../../test/database-utils';

interface GraphBody {
  nodes: { id: string; title: string; type: string }[];
  edges: { target: string }[];
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

  it('keeps only the relations true on the asked date', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph?date=2026-03-15', {
      cookie: await signIn(),
    });
    const graph: GraphBody = await response.json();
    expect(graph.edges.map((edge) => edge.target)).toEqual(['second-brain/projets/initech']);
  });

  it('refuses a date that is not one', async () => {
    const { app } = buildTestContext(CONTENT_FIXTURE);
    const response = await requestJson(app, '/api/graph?date=mars', { cookie: await signIn() });
    expect(response.status).toBe(400);
  });
});
