import {
  takeCommentCreateToolInputSchema,
  takeCommentPathSchema,
  takeCommentUpdateToolInputSchema,
  takeCreateSchema,
  takeListQuerySchema,
  takePathSchema,
  takeSignSchema,
} from './takes.schema';
import {
  createTake,
  createTakeComment,
  defineTool,
  getCommentsOfTake,
  getTakesOfSong,
  mintTakeUpload,
  patchTakeComment,
  removeTake,
  removeTakeComment,
} from './takes.service';

// @FollowsBlueprint controller-dispatch
export const TAKE_TOOLS = [
  defineTool({
    name: 'list_takes',
    description:
      'List the recorded takes of the song `songId`, newest first, each with its comment count.',
    route: 'GET /api/takes',
    inputSchema: takeListQuerySchema,
    run: async ({ songId }) => ({
      kind: 'answered',
      body: { takes: await getTakesOfSong(songId) },
    }),
  }),
  defineTool({
    name: 'list_take_comments',
    description: 'Read the comments on the take `id`, ordered by their moment in the recording.',
    route: 'GET /api/takes/:id/comments',
    inputSchema: takePathSchema,
    run: async ({ id }) => {
      const outcome = await getCommentsOfTake(id);
      if (outcome.kind === 'take-not-found')
        return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { comments: outcome.comments } };
    },
  }),
  defineTool({
    name: 'request_take_upload',
    description:
      'First step of adding a take from a local audio file. Choose a new UUID as `takeId`, give the song, the content type and the file size in bytes. Answers a presigned `uploadUrl`: send the file to it with an HTTP PUT carrying the same Content-Type and Content-Length, before `expiresAt`, then call `create_take` with the same id and the returned `objectKey`.',
    route: 'POST /api/takes/sign',
    inputSchema: takeSignSchema,
    run: async (input, actor) => {
      const outcome = await mintTakeUpload(input, actor.now);
      if (outcome.kind === 'song-not-found')
        return { kind: 'refused', body: { error: outcome.kind } };
      return {
        kind: 'answered',
        body: {
          uploadUrl: outcome.uploadUrl,
          objectKey: outcome.objectKey,
          expiresAt: outcome.expiresAt,
        },
      };
    },
  }),
  defineTool({
    name: 'create_take',
    description:
      'Second step of adding a take, once the file is uploaded: record it on the song, and on the session `sessionId` if given. `id` and `objectKey` are the ones `request_take_upload` used; `source` is `upload` for a file and `queued` is false. The take is attributed to you and the band is notified.',
    route: 'POST /api/takes',
    inputSchema: takeCreateSchema,
    run: async (input, actor) => {
      const outcome = await createTake(input, actor);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { take: outcome.take } };
    },
  }),
  defineTool({
    name: 'delete_take',
    description: 'Delete the take `id`, its comments and its audio file.',
    route: 'DELETE /api/takes/:id',
    inputSchema: takePathSchema,
    run: async ({ id }) => {
      const outcome = await removeTake(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
  defineTool({
    name: 'comment_on_take',
    description:
      'Comment on the take `id`, as you. `atSeconds` pins the comment to a moment of the recording; leave it out for a comment on the whole take.',
    route: 'POST /api/takes/:id/comments',
    inputSchema: takeCommentCreateToolInputSchema,
    run: async ({ id, ...comment }, actor) => {
      const outcome = await createTakeComment(id, comment, actor);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { comment: outcome.comment } };
    },
  }),
  defineTool({
    name: 'update_take_comment',
    description:
      'Change the text or the moment of the comment `commentId` on the take `id`; give at least one of `body` and `atSeconds`.',
    route: 'PATCH /api/takes/:id/comments/:commentId',
    inputSchema: takeCommentUpdateToolInputSchema,
    run: async ({ id, commentId, ...changes }) => {
      if (changes.body === undefined && changes.atSeconds === undefined) {
        return { kind: 'refused', body: { error: 'empty-update' } };
      }
      const outcome = await patchTakeComment(id, commentId, changes);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { comment: outcome.comment } };
    },
  }),
  defineTool({
    name: 'delete_take_comment',
    description: 'Delete the comment `commentId` on the take `id`.',
    route: 'DELETE /api/takes/:id/comments/:commentId',
    inputSchema: takeCommentPathSchema,
    run: async ({ id, commentId }) => {
      const outcome = await removeTakeComment(id, commentId);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id: commentId, deleted: true } };
    },
  }),
];
