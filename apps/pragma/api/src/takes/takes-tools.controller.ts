import {
  takeCreateSchema,
  takeListToolInputSchema,
  takeReadToolInputSchema,
  takeSignToolInputSchema,
} from './takes.schema';
import {
  createTake,
  defineDeletion,
  defineTool,
  listTakesForTool,
  mintTakeUpload,
  pageItems,
  readTakeForTool,
  removeTakeByReference,
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
];

export const TAKE_DELETION = defineDeletion({
  route: 'DELETE /api/takes/:id',
  remove: async (reference) => {
    const outcome = await removeTakeByReference(reference);
    if (outcome === 'not-found') return { kind: 'refused', body: { error: outcome } };
    return { kind: 'answered', body: { id: reference, deleted: true } };
  },
});
