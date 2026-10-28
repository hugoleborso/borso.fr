import {
  sessionCreateToolInputSchema,
  sessionFindToolInputSchema,
  sessionReferenceToolInputSchema,
  sessionUpdateToolInputSchema,
} from './sessions.schema';
import {
  confirmUpdate,
  createSession,
  defineTool,
  listSessionsForTool,
  pageItems,
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
    name: 'create_session',
    description:
      'Add a session. `session.kind` is `concert` (with venue and capacity) or `practice`; `date` is ISO 8601. `create_setlist` then fills it.',
    routes: ['POST /api/sessions'],
    inputSchema: sessionCreateToolInputSchema,
    run: async ({ session }, actor) => {
      const created = await createSession(session, actor);
      return {
        kind: 'answered',
        body: { id: created.id, kind: created.kind, date: created.date.toISOString() },
      };
    },
  }),
  defineTool({
    name: 'update_session',
    description: 'Change some fields of a session; `changes` holds only the fields to change.',
    routes: ['PUT /api/sessions/:id'],
    inputSchema: sessionUpdateToolInputSchema,
    run: async ({ session, changes }, actor) => {
      const id = await resolveSessionId(session, actor.now);
      const outcome = await patchSession(id, changes, actor);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: confirmUpdate(id, changes) };
    },
  }),
  defineTool({
    name: 'delete_session',
    description: 'Delete a session; its setlists and takes are kept, detached from it.',
    routes: ['DELETE /api/sessions/:id'],
    inputSchema: sessionReferenceToolInputSchema,
    run: async ({ session }, actor) => {
      const id = await resolveSessionId(session, actor.now);
      const outcome = await removeSession(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
