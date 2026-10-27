import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const SERVICE_UNAVAILABLE_STATUS = 503;

const barSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  city: z.string().nullable(),
});
const barBodySchema = z.object({ bar: barSchema });
const barsBodySchema = z.object({ bars: z.array(barSchema) });

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('bars tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('adds, reads, lists, updates and deletes a bar, as the routes do', async () => {
    const band = await prepareAssistantBand();

    const created = await callTool(band.assistant, 'create_bar', {
      name: 'Le Zinc',
      status: 'lead',
      city: 'Lyon',
    });
    const { bar } = barBodySchema.parse(created.body);
    const read = await callTool(band.assistant, 'get_bar', { id: bar.id });
    const updated = await callTool(band.assistant, 'update_bar', {
      id: bar.id,
      status: 'contacted',
    });
    const listed = barsBodySchema.parse((await callTool(band.assistant, 'list_bars')).body);
    const deleted = await callTool(band.assistant, 'delete_bar', { id: bar.id });

    expect(bar).toMatchObject({ name: 'Le Zinc', status: 'lead', city: 'Lyon' });
    expect(barBodySchema.parse(read.body).bar.id).toBe(bar.id);
    expect(barBodySchema.parse(updated.body).bar.status).toBe('contacted');
    expect(listed.bars.map((listedBar) => listedBar.id)).toEqual([bar.id]);
    expect(deleted).toEqual({ isError: false, body: { id: bar.id, deleted: true } });
    expect(await callTool(band.assistant, 'get_bar', { id: bar.id })).toEqual(refusal('not-found'));
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = await callTool(band.assistant, 'create_bar', {
      name: 'Chez Max',
      status: 'cold',
    });
    const { bar } = barBodySchema.parse(created.body);

    expect(await callTool(band.assistant, 'update_bar', { id: bar.id })).toEqual(
      refusal('empty-update'),
    );
    expect(await callTool(band.assistant, 'update_bar', { id: unknownId, name: 'x' })).toEqual(
      refusal('not-found'),
    );
    expect(await callTool(band.assistant, 'delete_bar', { id: unknownId })).toEqual(
      refusal('not-found'),
    );
  });

  it('searches OpenStreetMap, and answers search-unavailable when it fails', async () => {
    const band = await prepareAssistantBand();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(new Response(null, { status: SERVICE_UNAVAILABLE_STATUS }));

    const found = await callTool(band.assistant, 'search_bar_places', {
      query: `zinc ${randomUUID()}`,
    });
    const failed = await callTool(band.assistant, 'search_bar_places', {
      query: `zinc ${randomUUID()}`,
    });

    expect(found).toEqual({ isError: false, body: { hits: [] } });
    expect(failed).toEqual(refusal('search-unavailable'));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
