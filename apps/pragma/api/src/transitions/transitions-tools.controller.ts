import { z } from 'zod';
import { transitionCommentToolInputSchema, transitionPairParamSchema } from './transitions.schema';
import {
  defineTool,
  findTransitionComment,
  getTransitionComments,
  removeTransitionComment,
  saveTransitionComment,
} from './transitions.service';

// @FollowsBlueprint controller-dispatch
export const TRANSITION_TOOLS = [
  defineTool({
    name: 'list_transition_comments',
    description: 'List every comment on a transition between two songs.',
    route: 'GET /api/transition-comments',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { comments: await getTransitionComments() } }),
  }),
  defineTool({
    name: 'get_transition_comment',
    description: 'Read the comment on the transition from song `a` to song `b`.',
    route: 'GET /api/transition-comments/:a/:b',
    inputSchema: transitionPairParamSchema,
    run: async ({ a, b }) => {
      const comment = await findTransitionComment(a, b);
      if (comment === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { comment } };
    },
  }),
  defineTool({
    name: 'set_transition_comment',
    description:
      'Write the comment on the transition from song `a` to song `b`, replacing any earlier one.',
    route: 'PUT /api/transition-comments/:a/:b',
    inputSchema: transitionCommentToolInputSchema,
    run: async ({ a, b, comment }, actor) => {
      await saveTransitionComment(a, b, comment, actor);
      return { kind: 'answered', body: { songAId: a, songBId: b, comment } };
    },
  }),
  defineTool({
    name: 'delete_transition_comment',
    description: 'Delete the comment on the transition from song `a` to song `b`.',
    route: 'DELETE /api/transition-comments/:a/:b',
    inputSchema: transitionPairParamSchema,
    run: async ({ a, b }) => {
      const outcome = await removeTransitionComment(a, b);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { songAId: a, songBId: b, deleted: true } };
    },
  }),
];
