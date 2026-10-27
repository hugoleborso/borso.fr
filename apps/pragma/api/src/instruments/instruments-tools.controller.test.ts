import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const instrumentSchema = z.object({ id: z.string().uuid(), name: z.string() });
const instrumentBodySchema = z.object({ instrument: instrumentSchema });
const instrumentsBodySchema = z.object({ instruments: z.array(instrumentSchema) });

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('instruments tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('adds, reorders, renames and deletes instruments, as the routes do', async () => {
    const band = await prepareAssistantBand();
    const drums = instrumentBodySchema.parse(
      (await callTool(band.assistant, 'create_instrument', { name: 'Drums', family: 'percussive' }))
        .body,
    ).instrument;
    const bass = instrumentBodySchema.parse(
      (await callTool(band.assistant, 'create_instrument', { name: 'Bass', family: 'harmonic' }))
        .body,
    ).instrument;

    const reordered = instrumentsBodySchema.parse(
      (
        await callTool(band.assistant, 'reorder_instruments', {
          instrumentIds: [bass.id, drums.id],
        })
      ).body,
    );
    const renamed = await callTool(band.assistant, 'update_instrument', {
      id: bass.id,
      name: 'Double bass',
    });
    const deleted = await callTool(band.assistant, 'delete_instrument', { id: drums.id });
    const listed = instrumentsBodySchema.parse(
      (await callTool(band.assistant, 'list_instruments')).body,
    );

    expect(reordered.instruments.map((instrument) => instrument.id)).toEqual([bass.id, drums.id]);
    expect(instrumentBodySchema.parse(renamed.body).instrument.name).toBe('Double bass');
    expect(deleted).toEqual({ isError: false, body: { id: drums.id, deleted: true } });
    expect(listed.instruments.map((instrument) => instrument.name)).toEqual(['Double bass']);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const bass = instrumentBodySchema.parse(
      (await callTool(band.assistant, 'create_instrument', { name: 'Bass', family: 'harmonic' }))
        .body,
    ).instrument;

    expect(
      await callTool(band.assistant, 'reorder_instruments', { instrumentIds: [unknownId] }),
    ).toEqual(refusal('reorder-stale'));
    expect(await callTool(band.assistant, 'update_instrument', { id: bass.id })).toEqual(
      refusal('empty-update'),
    );
    expect(
      await callTool(band.assistant, 'update_instrument', { id: unknownId, name: 'Oboe' }),
    ).toEqual(refusal('not-found'));
    expect(await callTool(band.assistant, 'delete_instrument', { id: unknownId })).toEqual(
      refusal('not-found'),
    );
  });
});
