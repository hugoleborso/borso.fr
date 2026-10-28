import {
  transitionCommentToolInputSchema,
  transitionListToolInputSchema,
} from './transitions.schema';
import {
  defineTool,
  listTransitionCommentsForTool,
  resolveSongId,
  writeTransitionComment,
} from './transitions.service';

// @FollowsBlueprint controller-dispatch
export const TRANSITION_TOOLS = [
  defineTool({
    name: 'list_transition_comments',
    description:
      'List comments on transitions between two songs, optionally only those leaving `from` or reaching `to` (titles or ids).',
    routes: ['GET /api/transition-comments', 'GET /api/transition-comments/:a/:b'],
    inputSchema: transitionListToolInputSchema,
    run: async ({ from, to }) => ({
      kind: 'answered',
      body: { comments: await listTransitionCommentsForTool(from, to) },
    }),
  }),
  defineTool({
    name: 'set_transition_comment',
    description:
      'Write the comment on the transition from song `from` to song `to`, replacing any earlier one; null deletes it.',
    routes: ['PUT /api/transition-comments/:a/:b', 'DELETE /api/transition-comments/:a/:b'],
    inputSchema: transitionCommentToolInputSchema,
    run: async ({ from, to, comment }, actor) => {
      const [fromId, toId] = [await resolveSongId(from), await resolveSongId(to)];
      const outcome = await writeTransitionComment(fromId, toId, comment, actor);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { fromId, toId, comment } };
    },
  }),
];
