import {
  barCreateSchema,
  barListToolInputSchema,
  barReferenceToolInputSchema,
  barSaveToolInputSchema,
  barSearchQuerySchema,
} from './bars.schema';
import {
  confirmUpdate,
  createBar,
  defineDeletion,
  defineTool,
  getBarById,
  listBarsForTool,
  parseToolFields,
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
    name: 'save_bar',
    description:
      'Add a bar to prospect (`name` and `status` required), or, with `bar` (name or id), change only the fields given.',
    routes: ['POST /api/bars', 'PUT /api/bars/:id'],
    inputSchema: barSaveToolInputSchema,
    run: async ({ bar, ...fields }) => {
      if (bar === undefined) {
        const created = await createBar(parseToolFields(barCreateSchema, fields));
        return { kind: 'answered', body: { id: created.id, name: created.name } };
      }
      const id = await resolveBarId(bar);
      const outcome = await patchBar(id, fields);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, fields) };
    },
  }),
];

export const BAR_DELETION = defineDeletion({
  route: 'DELETE /api/bars/:id',
  remove: async (reference) => {
    const id = await resolveBarId(reference);
    const outcome = await removeBar(id);
    if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
    return { kind: 'answered', body: { id, deleted: true } };
  },
});
