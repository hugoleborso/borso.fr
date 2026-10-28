import {
  barCreateSchema,
  barListToolInputSchema,
  barReferenceToolInputSchema,
  barSearchQuerySchema,
  barUpdateToolInputSchema,
} from './bars.schema';
import {
  confirmUpdate,
  createBar,
  defineTool,
  listBarsForTool,
  getBarById,
  patchBar,
  removeBar,
  resolveBarId,
  searchBarsInPlaces,
} from './bars.service';

// @FollowsBlueprint controller-dispatch
export const BAR_TOOLS = [
  defineTool({
    name: 'list_bars',
    description:
      'List the bars the band prospects, by name; `query` matches name or city. `get_bar` reads contacts and notes.',
    routes: ['GET /api/bars'],
    inputSchema: barListToolInputSchema,
    run: async (filter) => ({ kind: 'answered', body: { bars: await listBarsForTool(filter) } }),
  }),
  defineTool({
    name: 'search_bar_places',
    description:
      'Search OpenStreetMap for venues matching `query`, to fill in a bar before adding it.',
    routes: ['GET /api/bars/search'],
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
    description: 'Read one bar, by name or id, with its contacts and notes.',
    routes: ['GET /api/bars/:id'],
    inputSchema: barReferenceToolInputSchema,
    run: async ({ bar }) => {
      const found = await getBarById(await resolveBarId(bar));
      if (found === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { bar: found } };
    },
  }),
  defineTool({
    name: 'create_bar',
    description: 'Add a bar to prospect.',
    routes: ['POST /api/bars'],
    inputSchema: barCreateSchema,
    run: async (input) => {
      const created = await createBar(input);
      return { kind: 'answered', body: { id: created.id, name: created.name } };
    },
  }),
  defineTool({
    name: 'update_bar',
    description: 'Change the fields given of a bar, named by name or id.',
    routes: ['PUT /api/bars/:id'],
    inputSchema: barUpdateToolInputSchema,
    run: async ({ bar, ...changes }) => {
      const id = await resolveBarId(bar);
      const outcome = await patchBar(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, changes) };
    },
  }),
  defineTool({
    name: 'delete_bar',
    description: 'Delete a bar.',
    routes: ['DELETE /api/bars/:id'],
    inputSchema: barReferenceToolInputSchema,
    run: async ({ bar }) => {
      const id = await resolveBarId(bar);
      const outcome = await removeBar(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
