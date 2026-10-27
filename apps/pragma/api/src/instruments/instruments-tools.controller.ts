import { z } from 'zod';
import {
  createInstrumentSchema,
  instrumentIdParamSchema,
  instrumentOrderSchema,
  instrumentUpdateToolInputSchema,
} from './instruments.schema';
import {
  createInstrument,
  defineTool,
  getInstrumentsSorted,
  patchInstrument,
  removeInstrument,
  reorderInstruments,
} from './instruments.service';

// @FollowsBlueprint controller-dispatch
export const INSTRUMENT_TOOLS = [
  defineTool({
    name: 'list_instruments',
    description: "List the band's instruments in their display order, each with who plays it.",
    route: 'GET /api/instruments',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { instruments: await getInstrumentsSorted() } }),
  }),
  defineTool({
    name: 'create_instrument',
    description: 'Add an instrument to the band.',
    route: 'POST /api/instruments',
    inputSchema: createInstrumentSchema,
    run: async (input) => ({
      kind: 'answered',
      body: { instrument: await createInstrument(input) },
    }),
  }),
  defineTool({
    name: 'reorder_instruments',
    description:
      'Set the display order of the instruments; `instrumentIds` must list every instrument exactly once.',
    route: 'PUT /api/instruments/order',
    inputSchema: instrumentOrderSchema,
    run: async ({ instrumentIds }) => {
      const outcome = await reorderInstruments(instrumentIds);
      if (outcome.kind === 'stale') return { kind: 'refused', body: { error: 'reorder-stale' } };
      return { kind: 'answered', body: { instruments: outcome.instruments } };
    },
  }),
  defineTool({
    name: 'update_instrument',
    description: 'Change the fields given of the instrument `id`; give at least one.',
    route: 'PUT /api/instruments/:id',
    inputSchema: instrumentUpdateToolInputSchema,
    run: async ({ id, ...changes }) => {
      const outcome = await patchInstrument(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { instrument: outcome.instrument } };
    },
  }),
  defineTool({
    name: 'delete_instrument',
    description: 'Delete the instrument `id`.',
    route: 'DELETE /api/instruments/:id',
    inputSchema: instrumentIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeInstrument(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
