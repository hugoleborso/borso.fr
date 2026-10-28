import { z } from 'zod';
import {
  improvementCreateSchema,
  improvementReferenceToolInputSchema,
  improvementUpdateToolInputSchema,
  improvementVoteToolInputSchema,
} from './improvements.schema';
import {
  confirmUpdate,
  createImprovement,
  defineTool,
  getImprovementsForTool,
  patchImprovement,
  removeImprovement,
  resolveImprovementId,
  setImprovementVote,
} from './improvements.service';

// @FollowsBlueprint controller-dispatch
export const IMPROVEMENT_TOOLS = [
  defineTool({
    name: 'list_improvements',
    description: "List the band's improvement ideas, ranked by votes, with whether you voted.",
    routes: ['GET /api/improvements'],
    inputSchema: z.object({}),
    run: async (_input, actor) => ({
      kind: 'answered',
      body: { improvements: await getImprovementsForTool(actor.memberId) },
    }),
  }),
  defineTool({
    name: 'create_improvement',
    description: 'Propose an improvement, as you.',
    routes: ['POST /api/improvements'],
    inputSchema: improvementCreateSchema,
    run: async (input, actor) => {
      const improvement = await createImprovement(input, actor.memberId, actor.now);
      return { kind: 'answered', body: { id: improvement.id } };
    },
  }),
  defineTool({
    name: 'update_improvement',
    description: 'Change the fields given of an improvement, named by title or id.',
    routes: ['PUT /api/improvements/:id'],
    inputSchema: improvementUpdateToolInputSchema,
    run: async ({ improvement, ...changes }, actor) => {
      const id = await resolveImprovementId(improvement);
      const outcome = await patchImprovement(id, changes, actor.memberId);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, changes) };
    },
  }),
  defineTool({
    name: 'delete_improvement',
    description: 'Delete an improvement and its votes.',
    routes: ['DELETE /api/improvements/:id'],
    inputSchema: improvementReferenceToolInputSchema,
    run: async ({ improvement }) => {
      const id = await resolveImprovementId(improvement);
      const outcome = await removeImprovement(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'vote_on_improvement',
    description: 'Vote for an improvement as you (`vote: true`), or withdraw your vote.',
    routes: ['PUT /api/improvements/:id/vote', 'DELETE /api/improvements/:id/vote'],
    inputSchema: improvementVoteToolInputSchema,
    run: async ({ improvement, vote }, actor) => {
      const id = await resolveImprovementId(improvement);
      const view = await setImprovementVote(id, vote, actor.memberId, actor.now);
      if (view === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { id, votes: view.votes, mine: view.mine } };
    },
  }),
];
