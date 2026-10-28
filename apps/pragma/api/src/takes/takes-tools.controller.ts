import {
  takeCommentCreateToolInputSchema,
  takeCommentPathToolInputSchema,
  takeCommentUpdateToolInputSchema,
  takeCreateSchema,
  takeListToolInputSchema,
  takeReadToolInputSchema,
  takeReferenceToolInputSchema,
  takeSignToolInputSchema,
} from './takes.schema';
import {
  confirmUpdate,
  createTake,
  createTakeComment,
  defineTool,
  listTakesForTool,
  mintTakeUpload,
  pageItems,
  patchTakeComment,
  readTakeForTool,
  removeTake,
  removeTakeComment,
  resolveSongId,
  resolveTakeId,
} from './takes.service';

const TAKE_PAGE_SIZE = 10;

// @FollowsBlueprint controller-dispatch
export const TAKE_TOOLS = [
  defineTool({
    name: 'list_takes',
    description: 'List the takes of a song (title or id), newest first, with comment counts.',
    routes: ['GET /api/takes'],
    inputSchema: takeListToolInputSchema,
    run: async ({ song, limit, cursor }) => {
      const page = pageItems(await listTakesForTool(song), { limit, cursor }, TAKE_PAGE_SIZE);
      return {
        kind: 'answered',
        body: { takes: page.items, total: page.total, nextCursor: page.nextCursor },
      };
    },
  }),
  defineTool({
    name: 'get_take',
    description:
      'Read a take with its comments in recording order: `take` by id, or `song` for its latest take.',
    routes: ['GET /api/takes/:id/comments'],
    inputSchema: takeReadToolInputSchema,
    run: async ({ take, song }) => {
      const view = await readTakeForTool(await resolveTakeId(take, song));
      if (view === null) return { kind: 'refused', body: { error: 'take-not-found' } };
      return { kind: 'answered', body: view };
    },
  }),
  defineTool({
    name: 'request_take_upload',
    description:
      'Step 1 of adding a take from an audio file: pick a new UUID `takeId`; answers a presigned `uploadUrl`. PUT the file there with the same Content-Type and Content-Length before `expiresAt`, then call `create_take` with that id, `songId` and `objectKey`.',
    routes: ['POST /api/takes/sign'],
    inputSchema: takeSignToolInputSchema,
    run: async ({ song, ...input }, actor) => {
      const songId = await resolveSongId(song);
      const outcome = await mintTakeUpload({ ...input, songId }, actor.now);
      if (outcome.kind === 'song-not-found') {
        return { kind: 'refused', body: { error: outcome.kind } };
      }
      return {
        kind: 'answered',
        body: {
          songId,
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
      'Step 2, once uploaded: record the take on the song, and on `sessionId` if given; `source` is `upload` and `queued` false. The band is notified.',
    routes: ['POST /api/takes'],
    inputSchema: takeCreateSchema,
    run: async (input, actor) => {
      const outcome = await createTake(input, actor);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { id: outcome.take.id } };
    },
  }),
  defineTool({
    name: 'delete_take',
    description: 'Delete a take, its comments and its audio file.',
    routes: ['DELETE /api/takes/:id'],
    inputSchema: takeReferenceToolInputSchema,
    run: async ({ take }) => {
      const outcome = await removeTake(take);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id: take, deleted: true } };
    },
  }),
  defineTool({
    name: 'comment_on_take',
    description:
      'Comment, as you, on `take` (id) or on the latest take of `song`. `atSeconds` pins it to a moment.',
    routes: ['POST /api/takes/:id/comments'],
    inputSchema: takeCommentCreateToolInputSchema,
    run: async ({ take, song, ...comment }, actor) => {
      const takeId = await resolveTakeId(take, song);
      const outcome = await createTakeComment(takeId, comment, actor);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { id: outcome.comment.id, takeId } };
    },
  }),
  defineTool({
    name: 'update_take_comment',
    description: 'Change the text or the moment of a comment on a take; give at least one.',
    routes: ['PATCH /api/takes/:id/comments/:commentId'],
    inputSchema: takeCommentUpdateToolInputSchema,
    run: async ({ take, comment, ...changes }) => {
      if (changes.body === undefined && changes.atSeconds === undefined) {
        return { kind: 'refused', body: { error: 'empty-update' } };
      }
      const outcome = await patchTakeComment(take, comment, changes);
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: confirmUpdate(comment, changes) };
    },
  }),
  defineTool({
    name: 'delete_take_comment',
    description: 'Delete a comment on a take.',
    routes: ['DELETE /api/takes/:id/comments/:commentId'],
    inputSchema: takeCommentPathToolInputSchema,
    run: async ({ take, comment }) => {
      const outcome = await removeTakeComment(take, comment);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
      return { kind: 'answered', body: { id: comment, deleted: true } };
    },
  }),
];
