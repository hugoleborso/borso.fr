import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  seedInstrument,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const instrumentsBodySchema = z.object({
  instruments: z.array(
    z.object({ id: z.string().uuid(), name: z.string(), players: z.array(z.string()) }),
  ),
});

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('instruments tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('lists the instruments in display order, then by name, with who plays each', async () => {
    const band = await prepareAssistantBand();
    const drumsId = await seedInstrument(band.hugo, { name: 'Drums', family: 'percussive' });
    const bassId = await seedInstrument(band.hugo, { name: 'Bass', family: 'harmonic' });
    await callTool(band.assistant, 'set_member_instruments', {
      member: 'Léa',
      instruments: ['Bass'],
    });

    const listed = instrumentsBodySchema.parse(
      (await callTool(band.assistant, 'list_instruments')).body,
    );

    expect(listed.instruments).toEqual([
      { id: bassId, name: 'Bass', players: ['Léa'] },
      { id: drumsId, name: 'Drums', players: [] },
    ]);
  });
});
