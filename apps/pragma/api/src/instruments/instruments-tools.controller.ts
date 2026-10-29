import { z } from 'zod';
import { defineTool, getInstrumentsForTool } from './instruments.service';

// @FollowsBlueprint controller-dispatch
export const INSTRUMENT_TOOLS = [
  defineTool({
    name: 'list_instruments',
    description: 'List the instruments in display order, with who plays each.',
    routes: ['GET /api/instruments'],
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { instruments: await getInstrumentsForTool() } }),
  }),
];
