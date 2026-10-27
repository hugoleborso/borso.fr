import { z } from 'zod';
import {
  barCreateSchema,
  barIdParamSchema,
  barSearchQuerySchema,
  barUpdateToolInputSchema,
} from './bars.schema';
import {
  createBar,
  defineTool,
  getBarById,
  getBarsSortedByName,
  patchBar,
  removeBar,
  searchBarsInPlaces,
} from './bars.service';

// @FollowsBlueprint controller-dispatch
export const BAR_TOOLS = [
  defineTool({
    name: 'list_bars',
    description: 'List the bars the band prospects for concerts, by name.',
    route: 'GET /api/bars',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { bars: await getBarsSortedByName() } }),
  }),
  defineTool({
    name: 'search_bar_places',
    description:
      'Search OpenStreetMap for venues matching `query`, to find the details of a bar before adding it.',
    route: 'GET /api/bars/search',
    inputSchema: barSearchQuerySchema,
    run: async ({ query }) => {
      const outcome = await searchBarsInPlaces(query);
      if (outcome.kind === 'unavailable') {
        return { kind: 'refused', body: { error: 'search-unavailable' } };
      }
      return { kind: 'answered', body: { hits: outcome.hits } };
    },
  }),
  defineTool({
    name: 'get_bar',
    description: 'Read one bar by its id.',
    route: 'GET /api/bars/:id',
    inputSchema: barIdParamSchema,
    run: async ({ id }) => {
      const bar = await getBarById(id);
      if (bar === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { bar } };
    },
  }),
  defineTool({
    name: 'create_bar',
    description: 'Add a bar to prospect.',
    route: 'POST /api/bars',
    inputSchema: barCreateSchema,
    run: async (input) => ({ kind: 'answered', body: { bar: await createBar(input) } }),
  }),
  defineTool({
    name: 'update_bar',
    description: 'Change the fields given of the bar `id`; give at least one.',
    route: 'PUT /api/bars/:id',
    inputSchema: barUpdateToolInputSchema,
    run: async ({ id, ...changes }) => {
      const outcome = await patchBar(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { bar: outcome.bar } };
    },
  }),
  defineTool({
    name: 'delete_bar',
    description: 'Delete the bar `id`.',
    route: 'DELETE /api/bars/:id',
    inputSchema: barIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeBar(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
