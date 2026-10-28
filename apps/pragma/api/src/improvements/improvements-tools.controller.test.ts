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

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('improvements tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('proposes an improvement and votes for it as the granting member, which the other member sees as not theirs', async () => {
    const band = await prepareAssistantBand();

    const created = await callTool(band.assistant, 'create_improvement', {
      title: 'Click track on stage',
    });
    const improvement = createdSchema.parse(created.body);
    const voted = await callTool(band.assistant, 'vote_on_improvement', {
      improvement: 'click track',
      vote: true,
    });
    const listed = await callTool(band.assistant, 'list_improvements');
    const seenByLea = await readJson(
      await jsonRequest(band.lea.app, '/api/improvements', { cookieHeader: band.lea.cookieHeader }),
      improvementsBodySchema,
    );
    const withdrawn = await callTool(band.assistant, 'vote_on_improvement', {
      improvement: improvement.id,
      vote: false,
    });

    expect(voted).toEqual({ isError: false, body: { id: improvement.id, votes: 1, mine: true } });
    expect(listed.body).toEqual({
      improvements: [
        { id: improvement.id, title: 'Click track on stage', status: 'idea', votes: 1, mine: true },
      ],
    });
    expect(seenByLea.improvements.map((seen) => [seen.voteCount, seen.votedByViewer])).toEqual([
      [1, false],
    ]);
    expect(withdrawn).toEqual({
      isError: false,
      body: { id: improvement.id, votes: 0, mine: false },
    });
  });

  it('updates and deletes an improvement, and answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = await callTool(band.assistant, 'create_improvement', { title: 'In-ears' });
    const improvement = createdSchema.parse(created.body);

    const updated = await callTool(band.assistant, 'update_improvement', {
      improvement: 'In-ears',
      status: 'planned',
    });

    expect(updated).toEqual({ isError: false, body: { id: improvement.id, updated: ['status'] } });
    expect(
      await callTool(band.assistant, 'update_improvement', { improvement: improvement.id }),
    ).toEqual(refusal('empty-update'));
    expect(
      await callTool(band.assistant, 'update_improvement', { improvement: unknownId, title: 'x' }),
    ).toEqual(refusal('not-found'));
    expect(
      await callTool(band.assistant, 'vote_on_improvement', { improvement: unknownId, vote: true }),
    ).toEqual(refusal('not-found'));
    expect(
      await callTool(band.assistant, 'vote_on_improvement', {
        improvement: unknownId,
        vote: false,
      }),
    ).toEqual(refusal('not-found'));
    expect(
      await callTool(band.assistant, 'delete_improvement', { improvement: improvement.id }),
    ).toEqual({ isError: false, body: { id: improvement.id, deleted: true } });
    expect(
      await callTool(band.assistant, 'delete_improvement', { improvement: improvement.id }),
    ).toEqual(refusal('not-found'));
  });
});
