import {
  sessionCreateSchema,
  sessionFindToolInputSchema,
  sessionSaveToolInputSchema,
  sessionUpdateSchema,
} from './sessions.schema';
import {
  confirmUpdate,
  createSession,
  defineDeletion,
  defineTool,
  listSessionsForTool,
  pageItems,
  parseToolFields,
  patchSession,
  removeSession,
  resolveSessionId,
} from './sessions.service';

const SESSION_PAGE_SIZE = 20;

// @FollowsBlueprint controller-dispatch
export const SESSION_TOOLS = [
  defineTool({
    name: 'find_sessions',
    description:
      'List concerts and practices, soonest first (`when`: upcoming, past latest first, or all). `get_session` reads one with its setlists.',
    routes: ['GET /api/sessions'],
    inputSchema: sessionFindToolInputSchema,
    run: async ({ when, kind, limit, cursor }, actor) => {
      const sessions = await listSessionsForTool(when, kind, actor.now);
      const page = pageItems(sessions, { limit, cursor }, SESSION_PAGE_SIZE);
      return {
        kind: 'answered',
        body: { sessions: page.items, total: page.total, nextCursor: page.nextCursor },
      };
    },
  }),
  defineTool({
    name: 'save_session',
    description:
      'Add a session: `kind` `concert` (with `venue` and `capacity`) or `practice`, `date` ISO 8601. With `session` (id, `next`, a day YYYY-MM-DD…), change only the fields given.',
    routes: ['POST /api/sessions', 'PUT /api/sessions/:id'],
    inputSchema: sessionSaveToolInputSchema,
    run: async ({ session, ...fields }, actor) => {
      if (session === undefined) {
        const created = await createSession(parseToolFields(sessionCreateSchema, fields), actor);
        return {
          kind: 'answered',
          body: { id: created.id, kind: created.kind, date: created.date.toISOString() },
        };
      }
      const id = await resolveSessionId(session, actor.now);
      const changes = parseToolFields(sessionUpdateSchema, fields);
      const outcome = await patchSession(id, changes, actor);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: confirmUpdate(id, changes) };
    },
  }),
];

export const SESSION_DELETION = defineDeletion({
  route: 'DELETE /api/sessions/:id',
  remove: async (reference, actor) => {
    const id = await resolveSessionId(reference, actor.now);
    const outcome = await removeSession(id);
    if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
    return { kind: 'answered', body: { id, deleted: true } };
  },
});
