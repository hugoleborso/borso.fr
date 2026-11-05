import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';
import { jsonRequest, readJson } from '../../../test/auth-utils';

const improvementSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  voteCount: z.number(),
  votedByViewer: z.boolean(),
});
const createdSchema = z.object({ id: z.string().uuid() });
const improvementsBodySchema = z.object({ improvements: z.array(improvementSchema) });
const toolListSchema = z.object({
  improvements: z.array(z.object({ title: z.string(), kind: z.string() })),
});
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('improvements tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('proposes an improvement as the granting member, and lists whether that member voted for it', async () => {
    const band = await prepareAssistantBand();

    const created = await callTool(band.assistant, 'save_improvement', {
      title: 'Click track on stage',
    });
    const improvement = createdSchema.parse(created.body);
    await jsonRequest(band.lea.app, `/api/improvements/${improvement.id}/vote`, {
      method: 'PUT',
      cookieHeader: band.lea.cookieHeader,
    });
    const listed = await callTool(band.assistant, 'list_improvements');
    const seenByLea = await readJson(
      await jsonRequest(band.lea.app, '/api/improvements', { cookieHeader: band.lea.cookieHeader }),
      improvementsBodySchema,
    );

    expect(listed.body).toEqual({
      improvements: [
        {
          id: improvement.id,
          title: 'Click track on stage',
          status: 'idea',
          kind: 'idea',
          createdAt: expect.stringMatching(ISO_TIMESTAMP),
          votes: 1,
          mine: false,
        },
      ],
    });
    expect(seenByLea.improvements.map((seen) => [seen.voteCount, seen.votedByViewer])).toEqual([
      [1, true],
    ]);
  });

  it('files a bug report, lists its kind, and turns it into an idea', async () => {
    const band = await prepareAssistantBand();
    const created = await callTool(band.assistant, 'save_improvement', {
      title: 'Setlist crashes on reload',
      kind: 'bug',
    });
    const improvement = createdSchema.parse(created.body);
    const listKinds = async (): Promise<string[]> =>
      toolListSchema
        .parse((await callTool(band.assistant, 'list_improvements')).body)
        .improvements.map((listed) => listed.kind);

    expect(await listKinds()).toEqual(['bug']);
    expect(
      await callTool(band.assistant, 'save_improvement', {
        improvement: improvement.id,
        kind: 'idea',
      }),
    ).toEqual({ isError: false, body: { id: improvement.id, updated: ['kind'] } });
    expect(await listKinds()).toEqual(['idea']);
  });

  it('updates and deletes an improvement, and answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = await callTool(band.assistant, 'save_improvement', { title: 'In-ears' });
    const improvement = createdSchema.parse(created.body);

    const updated = await callTool(band.assistant, 'save_improvement', {
      improvement: 'In-ears',
      status: 'planned',
    });

    expect(updated).toEqual({ isError: false, body: { id: improvement.id, updated: ['status'] } });
    expect(
      await callTool(band.assistant, 'save_improvement', { improvement: improvement.id }),
    ).toEqual(refusal('empty-update'));
    expect(
      await callTool(band.assistant, 'save_improvement', { improvement: unknownId, title: 'x' }),
    ).toEqual(refusal('not-found'));
    expect(await callTool(band.assistant, 'save_improvement', { details: 'x' })).toEqual({
      isError: true,
      body: { error: 'invalid-input', fields: { title: 'Required' } },
    });
    expect(
      await callTool(band.assistant, 'delete', { kind: 'improvement', id: improvement.id }),
    ).toEqual({ isError: false, body: { id: improvement.id, deleted: true } });
    expect(
      await callTool(band.assistant, 'delete', { kind: 'improvement', id: improvement.id }),
    ).toEqual(refusal('not-found'));
  });
});
