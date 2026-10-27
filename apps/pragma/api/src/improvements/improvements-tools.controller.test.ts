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
const improvementBodySchema = z.object({ improvement: improvementSchema });
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
    const { improvement } = improvementBodySchema.parse(created.body);
    const voted = await callTool(band.assistant, 'vote_for_improvement', { id: improvement.id });
    const listed = improvementsBodySchema.parse(
      (await callTool(band.assistant, 'list_improvements')).body,
    );
    const seenByLea = await readJson(
      await jsonRequest(band.lea.app, '/api/improvements', { cookieHeader: band.lea.cookieHeader }),
      improvementsBodySchema,
    );
    const withdrawn = await callTool(band.assistant, 'withdraw_improvement_vote', {
      id: improvement.id,
    });

    expect(improvementBodySchema.parse(voted.body).improvement).toMatchObject({
      voteCount: 1,
      votedByViewer: true,
    });
    expect(listed.improvements.map((listedOne) => listedOne.votedByViewer)).toEqual([true]);
    expect(seenByLea.improvements.map((seen) => [seen.voteCount, seen.votedByViewer])).toEqual([
      [1, false],
    ]);
    expect(improvementBodySchema.parse(withdrawn.body).improvement.voteCount).toBe(0);
  });

  it('updates and deletes an improvement, and answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = await callTool(band.assistant, 'create_improvement', { title: 'In-ears' });
    const { improvement } = improvementBodySchema.parse(created.body);

    const updated = await callTool(band.assistant, 'update_improvement', {
      id: improvement.id,
      status: 'planned',
    });

    expect(improvementBodySchema.parse(updated.body).improvement.status).toBe('planned');
    expect(await callTool(band.assistant, 'update_improvement', { id: improvement.id })).toEqual(
      refusal('empty-update'),
    );
    expect(
      await callTool(band.assistant, 'update_improvement', { id: unknownId, title: 'x' }),
    ).toEqual(refusal('not-found'));
    expect(await callTool(band.assistant, 'vote_for_improvement', { id: unknownId })).toEqual(
      refusal('not-found'),
    );
    expect(await callTool(band.assistant, 'withdraw_improvement_vote', { id: unknownId })).toEqual(
      refusal('not-found'),
    );
    expect(await callTool(band.assistant, 'delete_improvement', { id: improvement.id })).toEqual({
      isError: false,
      body: { id: improvement.id, deleted: true },
    });
    expect(await callTool(band.assistant, 'delete_improvement', { id: improvement.id })).toEqual(
      refusal('not-found'),
    );
  });
});
