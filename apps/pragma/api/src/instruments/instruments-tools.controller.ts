import {
  createInstrumentSchema,
  instrumentOrderToolInputSchema,
  instrumentReferenceToolInputSchema,
  instrumentUpdateToolInputSchema,
} from './instruments.schema';
import { z } from 'zod';
import {
  confirmUpdate,
  createInstrument,
  defineTool,
  getInstrumentsForTool,
  patchInstrument,
  removeInstrument,
  reorderInstruments,
  resolveInstrumentId,
  resolveInstrumentIds,
} from './instruments.service';

// @FollowsBlueprint controller-dispatch
export const INSTRUMENT_TOOLS = [
  defineTool({
    name: 'list_instruments',
    description: 'List the instruments in display order, with who plays each.',
    routes: ['GET /api/instruments'],
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { instruments: await getInstrumentsForTool() } }),
  }),
  defineTool({
    name: 'create_instrument',
    description: 'Add an instrument.',
    routes: ['POST /api/instruments'],
    inputSchema: createInstrumentSchema,
    run: async (input) => {
      const instrument = await createInstrument(input);
      return { kind: 'answered', body: { id: instrument.id, name: instrument.name } };
    },
  }),
  defineTool({
    name: 'reorder_instruments',
    description: 'Set the display order; `instruments` names every instrument once.',
    routes: ['PUT /api/instruments/order'],
    inputSchema: instrumentOrderToolInputSchema,
    run: async ({ instruments }) => {
      const outcome = await reorderInstruments(await resolveInstrumentIds(instruments));
      if (outcome.kind === 'stale') return { kind: 'refused', body: { error: 'reorder-stale' } };
      return { kind: 'answered', body: { order: instruments } };
    },
  }),
  defineTool({
    name: 'update_instrument',
    description: 'Change the fields given of an instrument.',
    routes: ['PUT /api/instruments/:id'],
    inputSchema: instrumentUpdateToolInputSchema,
    run: async ({ instrument, ...changes }) => {
      const id = await resolveInstrumentId(instrument);
      const outcome = await patchInstrument(id, changes);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, changes) };
    },
  }),
  defineTool({
    name: 'delete_instrument',
    description: 'Delete an instrument.',
    routes: ['DELETE /api/instruments/:id'],
    inputSchema: instrumentReferenceToolInputSchema,
    run: async ({ instrument }) => {
      const id = await resolveInstrumentId(instrument);
      const outcome = await removeInstrument(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
