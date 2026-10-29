import { z } from 'zod';
import { improvementCreateSchema, improvementSaveToolInputSchema } from './improvements.schema';
import {
  confirmUpdate,
  createImprovement,
  defineDeletion,
  defineTool,
  getImprovementsForTool,
  parseToolFields,
  patchImprovement,
  removeImprovement,
  resolveImprovementId,
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
    name: 'save_improvement',
    description:
      'Propose an improvement as you (`title` required), or, with `improvement` (title or id), change only the fields given.',
    routes: ['POST /api/improvements', 'PUT /api/improvements/:id'],
    inputSchema: improvementSaveToolInputSchema,
    run: async ({ improvement, ...fields }, actor) => {
      if (improvement === undefined) {
        const input = parseToolFields(improvementCreateSchema, fields);
        const created = await createImprovement(input, actor.memberId, actor.now);
        return { kind: 'answered', body: { id: created.id } };
      }
      const id = await resolveImprovementId(improvement);
      const outcome = await patchImprovement(id, fields, actor.memberId);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(id, fields) };
    },
  }),
];

export const IMPROVEMENT_DELETION = defineDeletion({
  route: 'DELETE /api/improvements/:id',
  remove: async (reference) => {
    const id = await resolveImprovementId(reference);
    const outcome = await removeImprovement(id);
    if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
    return { kind: 'answered', body: { id, deleted: true } };
  },
});
