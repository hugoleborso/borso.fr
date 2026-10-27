import { z } from 'zod';
import {
  sessionCreateToolInputSchema,
  sessionIdParamSchema,
  sessionUpdateToolInputSchema,
} from './sessions.schema';
import {
  createSession,
  defineTool,
  findSessionById,
  getSessions,
  patchSession,
  removeSession,
} from './sessions.service';

// @FollowsBlueprint controller-dispatch
export const SESSION_TOOLS = [
  defineTool({
    name: 'list_sessions',
    description: "List every session in the band's calendar: concerts and practices.",
    route: 'GET /api/sessions',
    inputSchema: z.object({}),
    run: async () => ({ kind: 'answered', body: { sessions: await getSessions() } }),
  }),
  defineTool({
    name: 'get_session',
    description: 'Read one session, a concert or a practice, by its id.',
    route: 'GET /api/sessions/:id',
    inputSchema: sessionIdParamSchema,
    run: async ({ id }) => {
      const session = await findSessionById(id);
      if (session === null) return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { session } };
    },
  }),
  defineTool({
    name: 'create_session',
    description:
      'Add a session to the calendar. `session.kind` is `concert` (with venue and capacity) or `practice`; `date` is an ISO 8601 date and time.',
    route: 'POST /api/sessions',
    inputSchema: sessionCreateToolInputSchema,
    run: async ({ session }, actor) => ({
      kind: 'answered',
      body: { session: await createSession(session, actor) },
    }),
  }),
  defineTool({
    name: 'update_session',
    description:
      'Change some fields of the session `id`; `changes` holds only the fields to change, the others keep their value.',
    route: 'PUT /api/sessions/:id',
    inputSchema: sessionUpdateToolInputSchema,
    run: async ({ id, changes }, actor) => {
      const outcome = await patchSession(id, changes, actor);
      if (outcome.kind === 'empty') return { kind: 'refused', body: { error: 'empty-update' } };
      if (outcome.kind === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { session: outcome.session } };
    },
  }),
  defineTool({
    name: 'delete_session',
    description: 'Delete a session; the setlists and takes it carried are kept, detached from it.',
    route: 'DELETE /api/sessions/:id',
    inputSchema: sessionIdParamSchema,
    run: async ({ id }) => {
      const outcome = await removeSession(id);
      if (outcome === 'not-found') return { kind: 'refused', body: { error: 'not-found' } };
      return { kind: 'answered', body: { id, deleted: true } };
    },
  }),
];
