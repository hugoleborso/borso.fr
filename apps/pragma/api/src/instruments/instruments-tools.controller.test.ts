import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const createdSchema = z.object({ id: z.string().uuid(), name: z.string() });
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

  it('adds, reorders, renames and deletes instruments by name, answering short confirmations', async () => {
    const band = await prepareAssistantBand();
    const drums = createdSchema.parse(
      (await callTool(band.assistant, 'create_instrument', { name: 'Drums', family: 'percussive' }))
        .body,
    );
    await callTool(band.assistant, 'create_instrument', { name: 'Bass', family: 'harmonic' });

    const reordered = await callTool(band.assistant, 'reorder_instruments', {
      instruments: ['bass', drums.id],
    });
    const renamed = await callTool(band.assistant, 'update_instrument', {
      instrument: 'Bass',
      name: 'Double bass',
    });
    const deleted = await callTool(band.assistant, 'delete_instrument', { instrument: 'drums' });
    const listed = instrumentsBodySchema.parse(
      (await callTool(band.assistant, 'list_instruments')).body,
    );

    expect(reordered).toEqual({ isError: false, body: { order: ['bass', drums.id] } });
    expect(renamed.body).toMatchObject({ updated: ['name'] });
    expect(deleted).toEqual({ isError: false, body: { id: drums.id, deleted: true } });
    expect(listed.instruments.map((instrument) => instrument.name)).toEqual(['Double bass']);
  });

  it('answers the refusal codes the routes answer, and names a reference nothing matches', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    await callTool(band.assistant, 'create_instrument', { name: 'Bass', family: 'harmonic' });

    expect(await callTool(band.assistant, 'reorder_instruments', { instruments: [] })).toEqual(
      refusal('reorder-stale'),
    );
    expect(await callTool(band.assistant, 'update_instrument', { instrument: 'Bass' })).toEqual(
      refusal('empty-update'),
    );
    expect(
      await callTool(band.assistant, 'update_instrument', { instrument: unknownId, name: 'Oboe' }),
    ).toEqual(refusal('not-found'));
    expect(await callTool(band.assistant, 'delete_instrument', { instrument: 'Oboe' })).toEqual({
      isError: true,
      body: { error: 'instrument-not-found', reference: 'Oboe' },
    });
  });
});
