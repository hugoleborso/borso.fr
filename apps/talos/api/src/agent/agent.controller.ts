import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { type AgentEnvironment, requireAgentToken } from './agent.middleware';
import {
  changeRequestValidator,
  contextQueryValidator,
  neighboursQueryValidator,
  pathQueryValidator,
  searchQueryValidator,
  slugQueryValidator,
  sqlBodyValidator,
  stateQueryValidator,
} from './agent.schema';
import {
  exportAgentMemory,
  lintAgentMemory,
  readAgentContext,
  readAgentNeighbours,
  readAgentPath,
  readMemoryDocument,
  readMemoryPage,
  readMemoryState,
  readMemoryStatus,
  recordAgentChanges,
  runMemoryQuery,
  searchAgentMemory,
} from './agent.service';

// @FollowsBlueprint controller-guarded-router
export function buildAgentRouter() {
  return new Hono<AgentEnvironment>()
    .use('*', requireAgentToken)
    .get('/status', async (context) =>
      context.json(await readMemoryStatus(context.get('tokenName'))),
    )
    .get('/context', contextQueryValidator, async (context) =>
      context.json(await readAgentContext(context.req.valid('query').budget)),
    )
    .get('/page', slugQueryValidator, async (context) =>
      context.json(await readMemoryPage(context.req.valid('query').slug)),
    )
    .get('/search', searchQueryValidator, async (context) => {
      const { q, limit } = context.req.valid('query');
      return context.json(await searchAgentMemory(q, limit));
    })
    .get('/graph/neighbours', neighboursQueryValidator, async (context) => {
      const { slug, date, depth } = context.req.valid('query');
      return context.json(await readAgentNeighbours(slug, date, depth));
    })
    .get('/graph/path', pathQueryValidator, async (context) => {
      const { from, to, date } = context.req.valid('query');
      return context.json(await readAgentPath(from, to, date));
    })
    .post('/sql', sqlBodyValidator, async (context) =>
      context.json(await runMemoryQuery(context.req.valid('json').query)),
    )
    .post('/changes', changeRequestValidator, async (context) =>
      context.json(await recordAgentChanges(context.req.valid('json'), context.get('tokenName'))),
    )
    .get('/lint', async (context) => context.json(await lintAgentMemory()))
    .get('/export', compress(), async (context) => context.json(await exportAgentMemory()))
    .get('/document', slugQueryValidator, async (context) =>
      context.json(await readMemoryDocument(context.req.valid('query').slug)),
    )
    .get('/state', stateQueryValidator, async (context) =>
      context.json(await readMemoryState(context.req.valid('query').key)),
    );
}
