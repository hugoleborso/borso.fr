import { z } from 'zod';
import {
  improvementCreateSchema,
  improvementIdParamSchema,
  improvementUpdateToolInputSchema,
} from './improvements.schema';
import {
  castVote,
  createImprovement,
  defineTool,
  getImprovementsRanked,
  patchImprovement,
  removeImprovement,
  withdrawVote,
} from './improvements.service';

// @FollowsBlueprint controller-dispatch
export const IMPROVEMENT_TOOLS = [
  defineTool({
    name: 'list_improvements',
    description:
      "List the band's improvement ideas, ranked by votes, each saying whether you voted for it.",
    route: 'GET /api/improvements',
    inputSchema: z.object({}),
    run: async (_input, actor) => ({
      kind: 'answered',
      body: { improvements: await getImprovementsRanked(actor.memberId) },
    }),
  }),
  defineTool({
    name: 'create_improvement',
    description: 'Propose an improvement for the band, as you.',
    route: 'POST /api/improvements',
    inputSchema: improvementCreateSchema,
    run: async (input, actor) => ({
      kind: 'answered',
      body: { improvement: await createImprovement(input, actor.memberId, actor.now) },
    }),
  }),
  defineTool({
    name: 'update_improvement',
    description: 'Change the fields given of the improvement `id`; give at least one.',
    route: 'PUT /api/improvements/:id',
    inputSchema: improvementUpdateToolInputSchema,
    run: async ({ id, ...changes }, actor) => {
      const outcome = await patchImprovement(id, changes, actor.memberId);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { improvement: outcome.improvement } };
    },
  }),
  defineTool({
    name: 'delete_improvement',
    description: 'Delete the improvement `id` and its votes.',
    route: 'DELETE /api/improvements/:id',
    inputSchema: improvementIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeImprovement(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'vote_for_improvement',
    description: 'Vote, as you, for the improvement `id`. Voting twice keeps one vote.',
    route: 'PUT /api/improvements/:id/vote',
    inputSchema: improvementIdParamSchema,
    run: async ({ id }, actor) => {
      const improvement = await castVote(id, actor.memberId, actor.now);
      if (improvement === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { improvement } };
    },
  }),
  defineTool({
    name: 'withdraw_improvement_vote',
    description: 'Withdraw your vote for the improvement `id`.',
    route: 'DELETE /api/improvements/:id/vote',
    inputSchema: improvementIdParamSchema,
    run: async ({ id }, actor) => {
      const improvement = await withdrawVote(id, actor.memberId);
      if (improvement === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { improvement } };
    },
  }),
];
